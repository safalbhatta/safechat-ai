const ImageKit = require("imagekit");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Upload a file buffer to ImageKit.
 * @param {Buffer} buffer     - file buffer from multer memoryStorage
 * @param {string} fileName   - desired filename (without path)
 * @param {string} folder     - ImageKit folder, e.g. "profile-pictures" or "chat-images"
 * @returns {{ url: string, fileId: string }}
 */
const uploadToImageKit = async (buffer, fileName, folder) => {
  const response = await imagekit.upload({
    file: buffer,
    fileName,
    folder: `/${folder}`,
    useUniqueFileName: true,
  });

  return { url: response.url, fileId: response.fileId };
};

module.exports = { imagekit, uploadToImageKit };
