"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Jimp = require("jimp");
const worker_threads_1 = require("worker_threads");
async function readImages(imagePaths) {
    try {
        const images = [];
        for (const imagePath of imagePaths) {
            try {
                const image = await Jimp.read(imagePath);
                images.push(image);
            }
            catch (error) {
                console.error(`Skipping file ${imagePath}`, { error });
            }
        }
        return images;
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
    console.log(resultRow.bitmap);
    return resultRow.bitmap;
}
// Listen for messages from the main thread
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', async (message) => {
        if (worker_threads_1.parentPort && message.message === 'init') {
            const { rowImages, maxWidth, maxHeight } = message.workerData;
            const result = stitchRow(await readImages(rowImages), maxWidth, maxHeight);
            // Send the result back to the main thread
            worker_threads_1.parentPort.postMessage({ result }, [result.data.buffer]);
            // Close the worker thread
            worker_threads_1.parentPort.close();
        }
    });
}
