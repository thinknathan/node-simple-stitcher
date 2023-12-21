import * as Jimp from 'jimp';
import { parentPort } from 'worker_threads';

async function readImages(imagePaths: string[]): Promise<Jimp[]> {
	try {
		const imagePromises = imagePaths.map(async (imagePath) => {
			try {
				return await Jimp.read(imagePath);
			} catch (error) {
				console.error(`Skipping file ${imagePath}`, { error });
				return null;
			}
		});

		return Promise.all(imagePromises).then(
			(images) => images.filter(Boolean) as Jimp[],
		);
	} catch (error) {
		console.error('Error reading images from folder', { error });
		return [];
	}
}

function stitchRow(
	rowImages: Jimp[],
	maxWidth: number,
	maxHeight: number,
): WorkerResult {
	const resultRow = new Jimp(
		rowImages.length * maxWidth,
		maxHeight,
		0x00000000,
	);

	rowImages.forEach((image, columnIndex) => {
		const x =
			columnIndex * maxWidth + Math.floor((maxWidth - image.getWidth()) / 2);
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
if (parentPort) {
	parentPort.on(
		'message',
		async (message: { message: string; workerData: WorkerData }) => {
			if (parentPort && message.message === 'init') {
				const { rowImages, maxWidth, maxHeight } = message.workerData;
				const images = await readImages(rowImages);
				const result = stitchRow(images, maxWidth, maxHeight);

				// Send the result back to the main thread
				parentPort.postMessage(result, [result.buffer]);

				// Close the worker thread
				parentPort.close();
			}
		},
	);
}
