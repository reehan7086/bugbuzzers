const AWS = require('aws-sdk');
const crypto = require('crypto');
const path = require('path');

// Configure DigitalOcean Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: process.env.DO_SPACES_REGION,
  signatureVersion: 'v4',
  s3ForcePathStyle: true
});

class MediaUploadService {
  constructor() {
    this.bucket = process.env.DO_SPACES_BUCKET;
    this.cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT;
    this.maxFileSize = 2 * 1024 * 1024; // 2MB
    this.allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    // Validate configuration
    if (!this.bucket || !process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
      console.error('❌ Missing DigitalOcean Spaces configuration');
    } else {
      console.log('✅ DigitalOcean Spaces configuration loaded');
    }
  }

  generateFileName(originalName, userId, bugId, userName = null) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Create safe folder name from user name
    const safeFolderName = userName 
      ? userName.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')  // Replace non-alphanumeric with dashes
          .replace(/-+/g, '-')         // Replace multiple dashes with single dash
          .replace(/^-|-$/g, '')       // Remove leading/trailing dashes
      : `user-${userId}`;
    
    // NEW: Create user-based folder structure with real names
    return `media/${year}/${month}/users/${safeFolderName}/${bugId || `temp-${timestamp}`}/${timestamp}-${random}${extension}`;
  }

  // Convert origin URL to CDN URL for faster delivery
  getCdnUrl(originUrl, key) {
    if (this.cdnEndpoint && originUrl) {
      const originEndpoint = `https://${this.bucket}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`;
      return originUrl.replace(originEndpoint, this.cdnEndpoint);
    }
    return originUrl;
  }

  validateFile(file, fileName) {
    const errors = [];

    if (file.size > this.maxFileSize) {
      errors.push(`File "${fileName}" exceeds 2MB limit`);
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type "${file.mimetype}" not allowed`);
    }

    return errors;
  }

async uploadFile(fileBuffer, fileName, mimeType, userId, bugId = null, userName = null) {
    try {
      const key = this.generateFileName(fileName, userId, bugId, userName);
      
      const uploadParams = {
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000', // 1 year cache for CDN
        Metadata: {
          'uploaded-by': userId.toString(),
          'user-name': userName || 'unknown',
          'upload-timestamp': Date.now().toString(),
          'original-name': fileName,
          'bug-id': bugId || 'temp'
        }
      };

      console.log(`📤 Uploading ${fileName} for user ${userName || userId} to DigitalOcean Spaces...`);
      const result = await s3.upload(uploadParams).promise();
      
      // Use CDN URL for faster delivery
      const cdnUrl = this.getCdnUrl(result.Location, key);
      
      return {
        url: cdnUrl,
        originUrl: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        size: fileBuffer.length,
        mimeType: mimeType,
        originalName: fileName,
        userName: userName
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload ${fileName}: ${error.message}`);
    }
  }

async uploadMultipleFiles(files, userId, bugId = null, userName = null) {
    const uploadPromises = files.map(async (file) => {
      const validationErrors = this.validateFile(file, file.originalname);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      return await this.uploadFile(file.buffer, file.originalname, file.mimetype, userId, bugId, userName);
    });

    try {
      const results = await Promise.all(uploadPromises);
      console.log(`✅ Successfully uploaded ${results.length} files for user ${userName || userId}`);
      return results;
    } catch (error) {
      console.error('Multiple upload error:', error);
      throw error;
    }
  }
}

  async testConnection() {
    try {
      await s3.headBucket({ Bucket: this.bucket }).promise();
      return { 
        success: true, 
        message: 'Connected to DigitalOcean Spaces (BLR1) successfully',
        cdnEnabled: !!this.cdnEndpoint
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async deleteFile(key) {
    try {
      await s3.deleteObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }
}

module.exports = new MediaUploadService();
