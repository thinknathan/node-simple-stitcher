import * as Jimp from 'jimp';
import { parentPort } from 'worker_threads';

async function readImages(imagePaths: string[]): Promise<Jimp[]> {
	try {
		const images: Jimp[] = [];

		for (const imagePath of imagePaths) {
			try {
				const image = await Jimp.read(imagePath);
				images.push(image);
			} catch (error) {
				console.error(`Skipping file ${imagePath}`, { error });
			}
		}

		return images;
	} catch (error) {
		console.error('Error reading images from folder', { error });
		return [];
	}
}

function stitchRow(rowImages: Jimp[], maxWidth: number, maxHeight: number) {
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

	console.log(resultRow.bitmap);

	return resultRow.bitmap;
}

// Listen for messages from the main thread
if (parentPort) {
	parentPort.on(
		'message',
		async (message: { message: string; workerData: WorkerData }) => {
			if (parentPort && message.message === 'init') {
				const { rowImages, maxWidth, maxHeight } = message.workerData;
				const result = stitchRow(
					await readImages(rowImages),
					maxWidth,
					maxHeight,
				);

				// Send the result back to the main thread
				parentPort.postMessage({ result }, [result.data.buffer]);

				// Close the worker thread
				parentPort.close();
			}
		},
	);
}
