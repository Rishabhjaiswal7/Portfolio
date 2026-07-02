const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const resumeDir = path.join(__dirname, '../uploads/resume');
const creativeDir = path.join(__dirname, '../uploads/creative');

if (!fs.existsSync(resumeDir)) {
  fs.mkdirSync(resumeDir, { recursive: true });
}
if (!fs.existsSync(creativeDir)) {
  fs.mkdirSync(creativeDir, { recursive: true });
}

// Resume storage configuration
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resumeDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume_${Date.now()}${ext}`);
  },
});

// Creative storage configuration
const creativeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, creativeDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `creative_${Date.now()}${ext}`);
  },
});

// File filters
const resumeFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for resume'), false);
  }
};

const creativeFilter = (req, file, cb) => {
  const allowedExts = /jpeg|jpg|png|gif|webp|svg|mp4|webm|quicktime|ogg|mov|pdf|zip|ppt|pptx/i;
  const allowedMimes = /image\/(jpeg|jpg|png|gif|webp|svg\+xml)|video\/(mp4|webm|quicktime|ogg|quicktime)|application\/(pdf|zip|x-zip-compressed|vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.presentationml\.presentation)/i;

  const isExtensionValid = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const isMimeTypeValid = allowedMimes.test(file.mimetype);

  if (isExtensionValid && isMimeTypeValid) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Supported: JPG, PNG, WEBP, SVG, MP4, WEBM, MOV, PDF, ZIP, PPT/X'), false);
  }
};

const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const uploadCreative = multer({
  storage: creativeStorage,
  fileFilter: creativeFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
});

module.exports = {
  uploadResume,
  uploadCreative,
};
