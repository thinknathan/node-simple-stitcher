"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stitchImages = void 0;
const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");
// Function to read images from the specified folder
async function readImages(folder) {
    const images = [];
    const files = await fs.promises.readdir(folder);
    const imagePromises = files.map(async (file) => {
        const imagePath = path.join(folder, file);
        try {
            images.push(await Jimp.read(imagePath));
        }
        catch (error) {
            console.error(`Skipping file ${file}`, { error });
        }
    });
    await Promise.all(imagePromises);
    return images;
}
// Function to stitch images together
async function stitchImages(inputFolder, maxColumns) {
    // Read images from the input folder
    const images = await readImages(inputFolder);
    if (images.length === 0) {
        throw new Error('No valid images found.');
    }
    // Find the maximum width and height among all images
    const maxWidth = Math.max(...images.map((img) => img.getWidth()));
    const maxHeight = Math.max(...images.map((img) => img.getHeight()));
    const columns = Math.min(maxColumns, images.length);
    const rows = Math.ceil(images.length / maxColumns);
    const resultWidth = columns * maxWidth;
    const resultHeight = rows * maxHeight;
    // Create a new image with a transparent background
    const resultImage = new Jimp(resultWidth, resultHeight, 0x00000000);
    images.forEach((image, index) => {
        const x = (index % columns) * maxWidth +
            Math.floor((maxWidth - image.getWidth()) / 2);
        const y = Math.floor(index / columns) * maxHeight +
            Math.floor((maxHeight - image.getHeight()) / 2);
        // Compose the images onto the result image with alpha transparency
        resultImage.composite(image, x, y);
    });
    return resultImage;
}
exports.stitchImages = stitchImages;
