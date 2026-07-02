const { validationResult } = require('express-validator');
const CreativeCategory = require('../models/CreativeCategory');
const CreativeItem = require('../models/CreativeItem');

// Helper to generate slugs
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
};

// GET /api/creative-categories (Public)
exports.getCategories = async (req, res) => {
  try {
    const categories = await CreativeCategory.find({ isEnabled: true }).sort({ displayOrder: 1 });
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Fetch categories error:', error.message);
    return res.status(500).json({ message: 'Server error fetching categories.' });
  }
};

// GET /api/admin/creative-categories (Admin All)
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await CreativeCategory.find().sort({ displayOrder: 1 });
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Fetch all categories error:', error.message);
    return res.status(500).json({ message: 'Server error fetching all categories.' });
  }
};

// POST /api/admin/creative-categories (Admin Create)
exports.createCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, icon, color, displayOrder, isEnabled } = req.body;
  const slug = slugify(name);

  try {
    // Check if slug is unique
    const existing = await CreativeCategory.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: 'A category with a similar name already exists.' });
    }

    const newCategory = new CreativeCategory({
      name,
      slug,
      description: description || '',
      icon: icon || '',
      color: color || '',
      displayOrder: displayOrder || 0,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
    });

    await newCategory.save();
    return res.status(201).json({ success: true, category: newCategory });
  } catch (error) {
    console.error('Create category error:', error.message);
    return res.status(500).json({ message: 'Server error creating category.' });
  }
};

// PUT /api/admin/creative-categories/:id (Admin Update)
exports.updateCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, icon, color, displayOrder, isEnabled } = req.body;

  try {
    const category = await CreativeCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    if (name && name !== category.name) {
      const slug = slugify(name);
      const existing = await CreativeCategory.findOne({ slug, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ message: 'A category with a similar name already exists.' });
      }
      category.name = name;
      category.slug = slug;
    }

    category.description = description !== undefined ? description : category.description;
    category.icon = icon !== undefined ? icon : category.icon;
    category.color = color !== undefined ? color : category.color;
    category.displayOrder = displayOrder !== undefined ? displayOrder : category.displayOrder;
    category.isEnabled = isEnabled !== undefined ? isEnabled : category.isEnabled;

    await category.save();
    return res.status(200).json({ success: true, category });
  } catch (error) {
    console.error('Update category error:', error.message);
    return res.status(500).json({ message: 'Server error updating category.' });
  }
};

// DELETE /api/admin/creative-categories/:id (Admin Delete)
exports.deleteCategory = async (req, res) => {
  try {
    // Check if category contains any items
    const itemCount = await CreativeItem.countDocuments({ categoryId: req.params.id });
    if (itemCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category. It contains ${itemCount} items. Move or delete the items first.`,
      });
    }

    const category = await CreativeCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Delete category error:', error.message);
    return res.status(500).json({ message: 'Server error deleting category.' });
  }
};

// PUT /api/admin/creative-categories/reorder (Admin Reorder Drag-n-Drop)
exports.reorderCategories = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ message: 'IDs array is required.' });
  }

  try {
    const bulkOps = ids.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { displayOrder: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await CreativeCategory.bulkWrite(bulkOps);
    }

    return res.status(200).json({ success: true, message: 'Categories reordered successfully.' });
  } catch (error) {
    console.error('Reorder categories error:', error.message);
    return res.status(500).json({ message: 'Server error reordering categories.' });
  }
};
