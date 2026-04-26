import logger from '#config/loggerConfig.js';

export const imageRenderMiddleware = (req, res, next) => {
    const payload = res.locals.imagePayload;

    if(!payload) {
        return next(new Error('Image payload is missing'));
    }

    const { filePath, contentType, errorContext } = payload;

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath, (err) => {
        if(err) {
            logger.error(`${errorContext} Render Error`, err);

            if(!res.headersSent) return next(err);
        }
    })
}