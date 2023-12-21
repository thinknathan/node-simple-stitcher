import * as Jimp from 'jimp';
import * as path from 'path';
import { Worker } from 'worker_threads';

/**
 * Manages a pool of worker threads for parallel processing of image files.
 */
export class WorkerPool {
	private workers: Worker[] = [];
	private taskQueue: { workerData: WorkerData; resolve: Function }[] = [];
	private maxWorkers: number;

	/**
	 * Creates a new WorkerPool instance.
	 *
	 * @param maxWorkers - The maximum number of worker threads in the pool.
	 */
	constructor(maxWorkers: number) {
		this.maxWorkers = maxWorkers;
	}

	/**
	 * Creates a worker thread for processing a specific file with given workerData.
	 *
	 * @param workerData - Image processing instructions for the file.
	 * @param resolve - Function to resolve the promise when the worker is done.
	 */
	private createWorker(workerData: WorkerData, resolve: Function): void {
		const worker = new Worker(path.join(__dirname, 'processImages.js'));

		worker.postMessage({ message: 'init', workerData: workerData });

		worker.on('error', (err) => {
			console.error(`Error in worker:`, err);
			resolve(null); // Resolve with null in case of an error
			this.processNextTask();
		});

		this.workers.push(worker);
	}

	/**
	 * Processes the next task in the queue.
	 */
	private processNextTask(): void {
		const nextTask = this.taskQueue.shift();
		if (nextTask) {
			this.createWorker(nextTask.workerData, nextTask.resolve);
		}
	}

	/**
	 * Adds a task to the worker pool for processing.
	 *
	 * @param workerData - Image processing instructions for the file.
	 * @returns Promise that resolves with the result from the worker.
	 */
	public addTask(workerData: WorkerData): Promise<any> {
		return new Promise((resolve) => {
			if (this.workers.length < this.maxWorkers) {
				this.createWorker(workerData, resolve);
			} else {
				this.taskQueue.push({ workerData, resolve });
			}
		});
	}

	/**
	 * Waits for all tasks to complete before exiting.
	 *
	 * @returns Promise that resolves with an array of results from all workers.
	 */
	public waitForCompletion(): Promise<any[]> {
		return Promise.all(
			this.workers.map(
				(worker) =>
					new Promise((resolve) => {
						worker.on('message', (message) => {
							resolve(message.result);
							this.processNextTask();
						});
					}),
			),
		);
	}
}
