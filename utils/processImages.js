"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Jimp = require("jimp");
const worker_threads_1 = require("worker_threads");
async function readImages(imagePaths) {
    try {
        const imagePromises = imagePaths.map(async (imagePath) => {
            try {
                return await Jimp.read(imagePath);
            }
            catch (error) {
                console.error(`Skipping file ${imagePath}`, { error });
                return null;
            }
        });
        return Promise.all(imagePromises).then((images) => images.filter(Boolean));
    }
    catch (error) {
        console.error('Error reading images from folder', { error });
        return [];
    }
}
function stitchRow(rowImages, maxWidth, maxHeight) {
    const resultRow = new Jimp(rowImages.length * maxWidth, maxHeight, 0x00000000);
    rowImages.forEach((image, columnIndex) => {
        const x = columnIndex * maxWidth + Math.floor((maxWidth - image.getWidth()) / 2);
        const y = Math.floor((maxHeight - image.getHeight()) / 2);
        resultRow.composite(image, x, y);
    });
    return {
        buffer: resultRow.bitmap.data.buffer,
        width: resultRow.bitmap.width,
        height: resultRow.bitmap.height,
    };
}
// Listen for messages from the main thread
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', async (message) => {
        if (worker_threads_1.parentPort && message.message === 'init') {
            const { rowImages, maxWidth, maxHeight } = message.workerData;
            const images = await readImages(rowImages);
            const result = stitchRow(images, maxWidth, maxHeight);
            // Send the result back to the main thread
            worker_threads_1.parentPort.postMessage(result, [result.buffer]);
            // Close the worker thread
            worker_threads_1.parentPort.close();
        }
    });
}
