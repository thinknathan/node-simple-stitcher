import * as fs from 'fs';
import * as path from 'path';
import * as Jimp from 'jimp';
import * as is from 'image-size';
import { WorkerPool } from './workerPool';
import { type ISizeCalculationResult } from 'image-size/dist/types/interface';

const imagePaths: string[] = [];

// Function to read images from the specified folder
async function readImages(folder: string): Promise<ISizeCalculationResult[]> {
	try {
		const files = await fs.promises.readdir(folder);
		const imagePromises: Promise<ISizeCalculationResult>[] = [];

		for (const file of files) {
			const imagePath = path.join(folder, file);

			// Wrap is.imageSize inside a Promise and resolve or reject accordingly
			const imageSizePromise = new Promise<ISizeCalculationResult>(
				(resolve, reject) => {
					is.imageSize(imagePath, (err, size) => {
						if (err) {
							console.error(`Error calculating image size for ${imagePath}`, {
								error: err,
							});
							reject(err);
						} else {
							imagePaths.push(imagePath);
							resolve(size!);
						}
					});
				},
			);

			imagePromises.push(imageSizePromise);
		}

		return await Promise.all(imagePromises);
	} catch (error) {
		console.error('Error reading images from folder', { error });
		return [];
	}
}

// Function to stitch images together
export async function stitchImages(
	inputFolder: string,
	maxColumns: number,
	threadCount: number,
): Promise<Jimp> {
	const imageSizeResults = await readImages(inputFolder);

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

	const workerPool = new WorkerPool(threadCount);

	for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
		const startIdx = rowIndex * columns;
		const endIdx = Math.min((rowIndex + 1) * columns, imageSizeResults.length);
		const rowSubset = imagePaths.slice(startIdx, endIdx);

		workerPool.addTask({ rowImages: rowSubset, maxWidth, maxHeight });
	}

	const rowImagesFinal: {
		buffer: Buffer;
		width: number;
		height: number;
	}[] = await workerPool.waitForCompletion();

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
