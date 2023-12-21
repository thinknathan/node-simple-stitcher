#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const yargs = require('yargs');
// Function to read images from the specified folder
async function readImages(folder) {
	try {
		const files = fs.readdirSync(folder);
		const images = [];
		for (const file of files) {
			const imagePath = path.join(folder, file);
			try {
				const image = await Jimp.read(imagePath);
				images.push(image);
			} catch (error) {
				console.error(`Skipping file ${file}`, { error });
			}
		}
		return images;
	} catch (error) {
		console.error('Error reading images from folder', { error });
		return [];
	}
}
// Function to stitch images together
function stitchImages(images, maxColumns) {
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
		const x =
			(index % columns) * maxWidth +
			Math.floor((maxWidth - image.getWidth()) / 2);
		const y =
			Math.floor(index / columns) * maxHeight +
			Math.floor((maxHeight - image.getHeight()) / 2);
		// Compose the images onto the result image with alpha transparency
		resultImage.composite(image, x, y);
	});
	return resultImage;
}
// Main function
async function main() {
	// Define the command line arguments
	const argv = yargs
		.option('folder', {
			alias: 'f',
			describe: 'Input folder containing square images',
			demandOption: true,
			type: 'string',
			coerce: (value) => {
				if (Array.isArray(value)) {
					value = value.join('');
				}
				return value;
			},
		})
		.option('maxColumns', {
			alias: 'c',
			describe: 'Maximum number of columns in the output image',
			demandOption: true,
			type: 'number',
		}).argv;
	console.time('Done in');
	const inputFolder = argv.folder;
	const maxColumns = argv.maxColumns;
	// Read images from the input folder
	const images = await readImages(inputFolder);
	if (images.length === 0) {
		console.log('No valid images found. Exiting.');
		return;
	}
	// Stitch images together
	const stitchedImage = stitchImages(images, maxColumns);
	// Create the output folder if it doesn't exist
	const outputFolder = 'output';
	if (!fs.existsSync(outputFolder)) {
		fs.mkdirSync(outputFolder);
	}
	const timestamp = new Date()
		.toISOString()
		.replace(/:/g, '-')
		.substring(0, 19);
	const outputFileName = `spritesheet_${timestamp}.png`;
	// Save the combined image to the output folder
	const outputImagePath = path.join(outputFolder, outputFileName);
	await stitchedImage.writeAsync(outputImagePath);
	console.log(`Combined image saved to: ${outputImagePath}`);
	console.timeEnd('Done in');
}
// Run the main function
main();
