#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const os = require('os');
const processTasks_1 = require('./utils/processTasks');
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
	// Split the task into threads
	let numCores = 1;
	try {
		numCores = os.cpus().length;
	} catch (err) {
		console.error(err);
	}
	numCores = Math.max(numCores - 1, 1); // Min 1
	numCores = Math.min(numCores, 16); // Max 16
	// Stitch images together
	const stitchedImage = await (0, processTasks_1.stitchImages)(
		inputFolder,
		maxColumns,
		numCores,
	);
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
