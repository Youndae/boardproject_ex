import CustomError from "@errors/customError.js"
import { ResponseStatus } from "@constants/responseStatus.js"


export const validate = (schema, property = 'body') => (req, res, next) => {
	try {
		schema.parse(req[property]);
		next();
	}catch(error) {
		next(new CustomError(ResponseStatus.BAD_REQUEST, error.errors));
	}
}