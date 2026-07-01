const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Stockage en mémoire (multer ne sauvegarde pas sur disque)
const storage = multer.memoryStorage();

// Filtre : uniquement les images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées'), false);
  }
};

// Middleware multer
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
  fileFilter
});

/**
 * Upload un buffer vers Cloudinary
 * @param {Buffer} buffer - Le buffer du fichier
 * @param {string} folder - Dossier dans Cloudinary (ex: "profiles")
 * @returns {Promise<string>} URL sécurisée de l'image
 */
function uploadToCloudinary(buffer, folder = 'profiles') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        transformation: [{ width: 300, height: 300, crop: 'fill' }]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    const readableStream = streamifier.createReadStream(buffer);
    readableStream.pipe(uploadStream);
  });
}

module.exports = { upload, uploadToCloudinary };