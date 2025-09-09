import path from 'path';

export const getBaseNameAndExt = (filename) => {
	const ext = path.extname(filename);
	const baseName = path.basename(filename, ext);
	return { baseName, ext };
}

export const getResizeProfileName = (filename) => {
	const { baseName, ext } = getBaseNameAndExt(filename);
	return `${baseName}_300${ext}`;
}