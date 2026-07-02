const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const CreativeItem = require('../models/CreativeItem');
const CreativeCategory = require('../models/CreativeCategory');
const storage = require('../utils/storage');

// GET /api/creative (Public Listing & Search/Filter/Sort)
exports.getItems = async (req, res) => {
  const { category, search, tag, featured, sort, page = 1, limit = 12 } = req.query;

  const query = { visibility: 'public' };

  try {
    // 1. Resolve Category (supports ID or slug)
    if (category && category !== 'all') {
      let catId = category;
      // If it doesn't look like a MongoDB ObjectId, assume it's a slug
      if (!category.match(/^[0-9a-fA-F]{24}$/)) {
        const catObj = await CreativeCategory.findOne({ slug: category });
        catId = catObj ? catObj._id : null;
      }
      query.categoryId = catId;
    }

    // 2. Global Text Search (Title, Description, Organization, Event, Location)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { organization: searchRegex },
        { event: searchRegex },
        { location: searchRegex },
        { tags: { $in: [searchRegex] } },
      ];
    }

    // 3. Tag Filter
    if (tag) {
      query.tags = tag;
    }

    // 4. Featured Filter
    if (featured === 'true' || featured === true) {
      query.featured = true;
    }

    // 5. Build Sorting
    let sortOptions = { displayOrder: 1, createdAt: -1 }; // Default sorting
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'alphabetical') {
      sortOptions = { title: 1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    // 6. Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await CreativeItem.countDocuments(query);
    
    const items = await CreativeItem.find(query)
      .populate('categoryId', 'name slug color icon')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Convert relative URLs to absolute URLs on request response dynamically
    const host = req.get('host');
    const protocol = req.protocol;
    
    const formattedItems = items.map(item => {
      const itemObj = item.toObject();
      if (itemObj.fileUrl && !itemObj.fileUrl.startsWith('http')) {
        itemObj.fileUrl = `${protocol}://${host}${itemObj.fileUrl}`;
      }
      if (itemObj.thumbnail && !itemObj.thumbnail.startsWith('http')) {
        itemObj.thumbnail = `${protocol}://${host}${itemObj.thumbnail}`;
      }
      return itemObj;
    });

    return res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      items: formattedItems,
    });
  } catch (error) {
    console.error('Fetch items error:', error.message);
    return res.status(500).json({ message: 'Server error fetching items.' });
  }
};

// GET /api/admin/creative (Admin All Items list)
exports.getAllItems = async (req, res) => {
  const { category } = req.query;
  const filter = {};
  
  if (category && category !== 'all') {
    filter.categoryId = category;
  }

  try {
    const items = await CreativeItem.find(filter)
      .populate('categoryId', 'name slug color')
      .sort({ displayOrder: 1, createdAt: -1 });

    const host = req.get('host');
    const protocol = req.protocol;
    const formattedItems = items.map(item => {
      const itemObj = item.toObject();
      if (itemObj.fileUrl && !itemObj.fileUrl.startsWith('http')) {
        itemObj.fileUrl = `${protocol}://${host}${itemObj.fileUrl}`;
      }
      if (itemObj.thumbnail && !itemObj.thumbnail.startsWith('http')) {
        itemObj.thumbnail = `${protocol}://${host}${itemObj.thumbnail}`;
      }
      return itemObj;
    });

    return res.status(200).json(formattedItems);
  } catch (error) {
    console.error('Fetch all items error:', error.message);
    return res.status(500).json({ message: 'Server error fetching all items.' });
  }
};

// POST /api/admin/creative (Upload and Create Items)
exports.uploadItems = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Please select one or more files to upload.' });
  }

  // Fetch Category ID from metadata body
  const { categoryId } = req.body;
  if (!categoryId) {
    // Clean files if categoryId validation fails
    req.files.forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    return res.status(400).json({ message: 'A valid categoryId is required.' });
  }

  try {
    const isSingle = req.files.length === 1;
    const itemsSaved = [];

    // Loop through uploaded files
    for (const file of req.files) {
      const uploadResult = await storage.uploadFile(file);

      // Create model entry
      const newItem = new CreativeItem({
        categoryId,
        title: isSingle && req.body.title ? req.body.title : path.basename(file.originalname, path.extname(file.originalname)),
        description: isSingle && req.body.description ? req.body.description : '',
        organization: isSingle && req.body.organization ? req.body.organization : '',
        event: isSingle && req.body.event ? req.body.event : '',
        location: isSingle && req.body.location ? req.body.location : '',
        tags: isSingle && req.body.tags ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        thumbnail: uploadResult.thumbnail,
        fileUrl: uploadResult.fileUrl,
        fileType: uploadResult.fileType,
        fileSize: uploadResult.fileSize,
        featured: isSingle && req.body.featured ? req.body.featured === 'true' : false,
        visibility: isSingle && req.body.visibility ? req.body.visibility : 'public',
        externalLink: isSingle && req.body.externalLink ? req.body.externalLink : '',
        author: isSingle && req.body.author ? req.body.author : 'Rishabh Jaiswal',
        credits: isSingle && req.body.credits ? req.body.credits : '',
      });

      await newItem.save();
      itemsSaved.push(newItem);
    }

    return res.status(201).json({
      success: true,
      message: `${itemsSaved.length} items uploaded successfully.`,
      items: itemsSaved,
    });
  } catch (error) {
    console.error('Upload items error:', error.message);
    return res.status(500).json({ message: 'Server error processing file uploads.' });
  }
};

// PUT /api/admin/creative/:id (Edit Item Metadata)
exports.updateItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    categoryId,
    title,
    description,
    organization,
    event,
    location,
    tags,
    featured,
    visibility,
    displayOrder,
    externalLink,
    author,
    credits
  } = req.body;

  try {
    const item = await CreativeItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    item.categoryId = categoryId || item.categoryId;
    item.title = title || item.title;
    item.description = description !== undefined ? description : item.description;
    item.organization = organization !== undefined ? organization : item.organization;
    item.event = event !== undefined ? event : item.event;
    item.location = location !== undefined ? location : item.location;
    
    if (tags !== undefined) {
      item.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    item.featured = featured !== undefined ? featured : item.featured;
    item.visibility = visibility || item.visibility;
    item.displayOrder = displayOrder !== undefined ? displayOrder : item.displayOrder;
    item.externalLink = externalLink !== undefined ? externalLink : item.externalLink;
    item.author = author !== undefined ? author : item.author;
    item.credits = credits !== undefined ? credits : item.credits;

    await item.save();
    return res.status(200).json({ success: true, item });
  } catch (error) {
    console.error('Update item metadata error:', error.message);
    return res.status(500).json({ message: 'Server error updating item metadata.' });
  }
};

// POST /api/admin/creative/:id/duplicate (Duplicate Item)
exports.duplicateItem = async (req, res) => {
  try {
    const item = await CreativeItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item to duplicate not found.' });
    }

    // Duplicate item object properties (creating a fresh document without _id and timestamps)
    const duplicateObj = item.toObject();
    delete duplicateObj._id;
    delete duplicateObj.createdAt;
    delete duplicateObj.updatedAt;

    duplicateObj.title = `${duplicateObj.title} - Copy`;
    duplicateObj.displayOrder = (duplicateObj.displayOrder || 0) + 1;

    const duplicatedItem = new CreativeItem(duplicateObj);
    await duplicatedItem.save();

    return res.status(201).json({
      success: true,
      message: 'Item duplicated successfully.',
      item: duplicatedItem,
    });
  } catch (error) {
    console.error('Duplicate item error:', error.message);
    return res.status(500).json({ message: 'Server error duplicating item.' });
  }
};

// DELETE /api/admin/creative/:id (Delete Item)
exports.deleteItem = async (req, res) => {
  try {
    const item = await CreativeItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // Delete static storage assets (Cloudinary or local)
    await storage.deleteFile(item.fileUrl, item.thumbnail);

    await CreativeItem.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: 'Item and associated file deleted.' });
  } catch (error) {
    console.error('Delete item error:', error.message);
    return res.status(500).json({ message: 'Server error deleting item.' });
  }
};

// PUT /api/admin/creative/bulk (Bulk Actions)
exports.bulkOperations = async (req, res) => {
  const { ids, action, targetCategoryId } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Array of item IDs is required.' });
  }

  try {
    switch (action) {
      case 'delete':
        // Loop and unlink storage files for each item
        const items = await CreativeItem.find({ _id: { $in: ids } });
        for (const item of items) {
          await storage.deleteFile(item.fileUrl, item.thumbnail);
        }
        await CreativeItem.deleteMany({ _id: { $in: ids } });
        return res.status(200).json({ success: true, message: `${ids.length} items bulk-deleted.` });

      case 'move':
        if (!targetCategoryId) {
          return res.status(400).json({ message: 'targetCategoryId is required for bulk move.' });
        }
        await CreativeItem.updateMany(
          { _id: { $in: ids } },
          { $set: { categoryId: targetCategoryId } }
        );
        return res.status(200).json({ success: true, message: `Moved ${ids.length} items to new category.` });

      case 'feature':
        await CreativeItem.updateMany(
          { _id: { $in: ids } },
          { $set: { featured: true } }
        );
        return res.status(200).json({ success: true, message: `Featured ${ids.length} items.` });

      case 'unfeature':
        await CreativeItem.updateMany(
          { _id: { $in: ids } },
          { $set: { featured: false } }
        );
        return res.status(200).json({ success: true, message: `Unfeatured ${ids.length} items.` });

      case 'hide':
        await CreativeItem.updateMany(
          { _id: { $in: ids } },
          { $set: { visibility: 'private' } }
        );
        return res.status(200).json({ success: true, message: `Hid ${ids.length} items (set private).` });

      case 'show':
        await CreativeItem.updateMany(
          { _id: { $in: ids } },
          { $set: { visibility: 'public' } }
        );
        return res.status(200).json({ success: true, message: `Made ${ids.length} items visible (set public).` });

      default:
        return res.status(400).json({ message: `Invalid bulk action: ${action}` });
    }
  } catch (error) {
    console.error('Bulk operations error:', error.message);
    return res.status(500).json({ message: 'Server error performing bulk actions.' });
  }
};
