const express = require('express');
const multer  = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// POST /api/uploads/image
// Accepts: multipart/form-data with field "image"
// Returns: { url: "https://pub-xxx.r2.dev/images/uuid.jpg" }
router.post('/image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const ext = req.file.mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const key = `images/${randomUUID()}.${ext}`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME,
      Key:         key,
      Body:        req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const url = `${process.env.R2_PUBLIC_URL}/${key}`;
    res.json({ url });
  } catch (err) {
    console.error('[R2 upload]', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/uploads/image
// Body: { url: "https://pub-xxx.r2.dev/images/uuid.jpg" }
router.delete('/image', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  // Extract key from URL: everything after the public base URL
  const base = process.env.R2_PUBLIC_URL.replace(/\/$/, '');
  const key  = url.replace(`${base}/`, '');
  if (!key || key === url) return res.status(400).json({ error: 'Invalid URL' });

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key:    key,
    }));
    res.json({ ok: true });
  } catch (err) {
    console.error('[R2 delete]', err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
