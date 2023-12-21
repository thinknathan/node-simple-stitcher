"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stitchImages = void 0;
const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");
const is = require("image-size");
const workerPool_1 = require("./workerPool");
const imagePaths = [];
// Function to read images from the specified folder
function readImages(folder) {
    try {
        const files = fs.readdirSync(folder);
        const images = [];
        for (const file of files) {
            const imagePath = path.join(folder, file);
            try {
                const image = is.imageSize(imagePath);
                images.push(image);
                imagePaths.push(imagePath);
            }
            catch (error) {
                console.error(`Skipping file ${file}`, { error });
            }
        }
        return images;
    }
    catch (error) {
        console.error('Error reading images from folder', { error });
        return [];
    }
}
// Function to stitch images together
async function stitchImages(inputFolder, maxColumns, threadCount) {
    const imageSizeResults = readImages(inputFolder);
    if (imageSizeResults.length === 0) {
        throw new Error('No valid images found.');
    }
    let maxWidth = -1;
    let maxHeight = -1;
    imageSizeResults.forEach((result) => {
        // Check and update the maximum width
        if (result.width && result.width > maxWidth) {
            maxWidth = result.width;
        }
        // Check and update the maximum height
        if (result.height && result.height > maxHeight) {
            maxHeight = result.height;
        }
    });
    const columns = Math.min(maxColumns, imageSizeResults.length);
    const rows = Math.ceil(imageSizeResults.length / maxColumns);
    const workerPool = new workerPool_1.WorkerPool(threadCount);
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        const startIdx = rowIndex * columns;
        const endIdx = Math.min((rowIndex + 1) * columns, imageSizeResults.length);
        const rowSubset = imagePaths.slice(startIdx, endIdx);
        workerPool.addTask({ rowImages: rowSubset, maxWidth, maxHeight });
    }
    const rowImagesFinal = await workerPool.waitForCompletion();
    const resultWidth = columns * maxWidth;
    const resultHeight = rows * maxHeight;
    const resultImage = new Jimp(resultWidth, resultHeight, 0x00000000);
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        const x = 0;
        const y = rowIndex * maxHeight;
        const rowImage = new Jimp({
            width: rowImagesFinal[rowIndex].width,
            height: rowImagesFinal[rowIndex].height,
            data: Buffer.from(new Uint8Array(rowImagesFinal[rowIndex].buffer)),
        });
        resultImage.composite(rowImage, x, y);
    }
    return resultImage;
}
exports.stitchImages = stitchImages;
