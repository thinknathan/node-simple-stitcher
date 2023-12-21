# node-simple-stitcher

Command-line utility that stitches together images in a folder to form a single spritesheet. It's simple because it only handles cases where all the input images are square.

## Install

1. Install [Nodejs](https://nodejs.org/en) or equivalent

2. Clone this project
   `git clone https://github.com/thinknathan/node-simple-stitcher`

3. Install dependencies
   `npm i`
   or
   `yarn`

## Usage

`node stitch.cjs`

```
-f, --folder      Input folder containing square images    [string] [required]
-c, --maxColumns  Maximum number of columns in the output image
                                                             [number] [required]
```

## Background

Created with Chat-GPT 3.5.
