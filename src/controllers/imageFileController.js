import { getImageDisplayService } from '#services/imageFile/imageFileService.js';
import logger from '#config/loggerConfig.js';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';

export async function getImageDisplay(req, res, next) {
	try {
		const display = await getImageDisplayService(req.params.imageName, res);

		res.setHeader('Cache-Control', 'public, max-age=3600');
		res.setHeader('Content-Type', display.contentType);

		res.sendFile(display.path, (err) => {
			if(err) 
				return next(err);
		});
	}catch(error){ 
		logger.error('getImageDisplay error: ', error);

		if(error instanceof CustomError)
			return next(error);

		return next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
	}
}