import path from 'path';

export const getBaseNameAndExt = (filename) => {
	const ext = path.extname(filename);
	const baseName = path.basename(filename, ext);
	return { baseName, ext };
}

export const getResizeProfileName = (filename) => {
	return getResizeName(filename, 300);
}

export const getImageBoardFileNames = (fileNames) => {
	const sizes = [300, 600];
	const names = Array.isArray(fileNames) ? fileNames : [fileNames];

	return names.flatMap(file => {
		return [
			file,
			...sizes.map(size => getResizeName(file, size))
		];
	});
}

export const getResizeName = (filename, size) => {
	const { baseName, ext } = getBaseNameAndExt(filename);
	return `${baseName}_${size}${ext}`;
}