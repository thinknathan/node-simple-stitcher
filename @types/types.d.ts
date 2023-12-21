declare type Options = {
	folder: string;
	maxColumns: number;
};

declare type WorkerData = {
	rowImages: string[];
	maxWidth: number;
	maxHeight: number;
};

declare type WorkerResult = {
	buffer: ArrayBufferLike;
	width: number;
	height: number;
};
