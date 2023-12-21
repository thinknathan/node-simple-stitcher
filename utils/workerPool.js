"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
const path = require("path");
const worker_threads_1 = require("worker_threads");
/**
 * Manages a pool of worker threads for parallel processing of image files.
 */
class WorkerPool {
    /**
     * Creates a new WorkerPool instance.
     *
     * @param maxWorkers - The maximum number of worker threads in the pool.
     */
    constructor(maxWorkers) {
        this.workers = [];
        this.taskQueue = [];
        this.maxWorkers = maxWorkers;
    }
    /**
     * Creates a worker thread for processing a specific file with given workerData.
     *
     * @param workerData - Image processing instructions for the file.
     * @param resolve - Function to resolve the promise when the worker is done.
     */
    createWorker(workerData, resolve) {
        const worker = new worker_threads_1.Worker(path.join(__dirname, 'processImages.js'));
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
    processNextTask() {
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
    addTask(workerData) {
        return new Promise((resolve) => {
            if (this.workers.length < this.maxWorkers) {
                this.createWorker(workerData, resolve);
            }
            else {
                this.taskQueue.push({ workerData, resolve });
            }
        });
    }
    /**
     * Waits for all tasks to complete before exiting.
     *
     * @returns Promise that resolves with an array of results from all workers.
     */
    waitForCompletion() {
        return Promise.all(this.workers.map((worker) => new Promise((resolve) => {
            worker.on('message', (message) => {
                resolve(message);
                this.processNextTask();
            });
        })));
    }
}
exports.WorkerPool = WorkerPool;
