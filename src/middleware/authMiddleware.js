import { ResponseStatus } from '@constants/responseStatus';


export const isLoggedIn = (req, res, next) => {
	if(req.userId)
		return next();
	else
		return next(new CustomError(ResponseStatus.FORBIDDEN));
};

export const isNotLoggedIn = (req, res, next) => {
	if(!req.userId)
		return next();
	else
		return next(new CustomError(ResponseStatus.FORBIDDEN));
};

export const isMember = (req, res, next) => {
	if(req.roles.includes('ROLE_MEMBER'))
		return next();
	else
		return next(new CustomError(ResponseStatus.FORBIDDEN));
}

export const isAdmin = (req, res, next) => {
	if(req.roles.includes('ROLE_ADMIN'))
		return next();
	else
		return next(new CustomError(ResponseStatus.FORBIDDEN));
};