import {
	getMemberStatus,
	registerService,
	checkIdService,
	checkNicknameService,
	patchProfileService,
	getProfileService,
	patchOAuthProfileService
} from "#services/member/memberService.js"
import { profileResize } from "#utils/resize.js"
import logger from "#config/loggerConfig.js"
import CustomError from "#errors/customError.js"
import { ResponseStatus, ResponseStatusCode } from "#constants/responseStatus.js"
import { JWTTokenProvider } from "#services/jwt/jwtTokenProvider.js"
import { getCookie } from "#utils/cookieUtils.js"
import { jwtConfig } from "#config/jwtConfig.js"
import passport from "passport"
import {getProfileImageDisplayService} from "#services/file/imageFileService.js";


export async function checkLogin(req, res, next) {
	try {
		const userId = req.user.id;

		const result = await getMemberStatus(userId);

		res.success(result);
	}catch(error) {
		logger.error('Failed to register member');
		next(error);
	}
}


/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 201
 * }
 */
export async function register(req, res, next) {
	try {
		const profileImage = req.file ? req.file.filename : null;

		if(profileImage){
			try {
				await profileResize(profileImage);
			}catch(error) {
				console.error('profileResize error : ', error);
				next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
			}
		}
		await registerService(req.body, profileImage);

		res.status(ResponseStatusCode.CREATED).json({});
	}catch(error) {
		logger.error('Failed to register member');
		next(error);
	}
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * 	data: {
 * 		isExist: true/false
 * }
 * }
 */
export async function checkId(req, res, next) {
	try {
		console.log('checkId: ', req.params.userId);
		const result = await checkIdService(req.params.userId);

		res.successWithMsg(result);
	}catch(error) {
		if(error instanceof CustomError && error.status === ResponseStatusCode.CONFLICT)
			logger.info('checkId Already exists. ', error);
		else
			logger.error('Failed to check id. ', error);

		return next(error);
	}
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
* 	status: 200,
* 	data: {
* 		isExist: true/false
* }
* }
*/
export async function checkNickname(req, res, next) {
	try {
		const userId = req.user ? req.user.userId : null;
		const result = await checkNicknameService(userId, req.params.nickname);

		res.successWithMsg(result)
	}catch(error) {
		if(error instanceof CustomError && error.status === ResponseStatusCode.CONFLICT)
			logger.info('checkNickname Already exists. ', error);
		else
			logger.error('Failed to check nickname. ', error);

		return next(error);
	}
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 *  message: 'SUCCESS' || 'FORBIDDEN'
 * 	data: {
 * 		userId: string
 * 	}
 * 	cookies: {
 * 		accessToken: httyOnly, secure, sameSite: 'strict',
 * 		refreshToken: httyOnly, secure, sameSite: 'strict',
 * 		ino: httyOnly, secure, sameSite: 'strict',
 * 	}
 * }
 * }
 */
export async function login(req, res, next) {
	
	//TODO: login validation
	//TODO: passport local strategy
	passport.authenticate('local', async (err, member, info) => {
		try {
			if(err){
				logger.error('Failed to login');
				return next(err);
			}
			if(!member) {
				logger.error('Failed to login. Invalid userId or userPw');
				return next(new CustomError(ResponseStatus.FORBIDDEN));
			}

			await JWTTokenProvider.issuedAllToken(member.userId, res);

			return res.status(ResponseStatusCode.OK)
					.json({
							id: member.userId,
						});
		}catch (error) {
			logger.error('Failed to login');
			next(error);
		}
	})(req, res, next);
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200
 * }
 */
export async function logout(req, res, next) {
	try {
		const inoValue = getCookie(req, jwtConfig.inoHeader);

		await JWTTokenProvider.deleteTokenDataAndCookie(req.user.userId, inoValue, res);

		return res.status(ResponseStatusCode.OK).json({});
	}catch (error) {
		logger.error('Failed to logout');
		next(error);
	}
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 * }
 */
export async function patchProfile(req, res, next) {
	try {
		const { nickname, email, deleteProfile = null } = req.body;
		const profileImage = req.file ? req.file.filename : null;

		if(profileImage){
			try {
				await profileResize(profileImage);
			}catch(error) {
				next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
			}
		}
		
		await patchProfileService(req.user.id, nickname, email, profileImage, deleteProfile);
		
		res.success();
	}catch (error) {
		logger.error('Failed to patch profile');
		next(error);
	}
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * 
 * @returns {
 * 	status: 200,
 *  message: 'SUCCESS',
 * 	data: {
 * 		nickname: string,
 * 		profileImage: string,
 * 	}
 * }
 */
export async function getProfile(req, res, next) {
	try {
		const result = await getProfileService(req.user.id);

		res.success(result);
	}catch (error) {
		logger.error('Failed to get profile');
		next(error);
	}
}

const allowedProviders = ['google', 'naver', 'kakao'];
const providerOptions = {
	google: { scope: ['profile', 'email'], session: false, prompt: 'consent' },
	kakao: { scope: ['account_email', 'profile_nickname'], session: false},
	naver: { session: false }
}

export async function oAuthLogin(req, res, next) {
	const { provider } = req.params;
	if(!allowedProviders.includes(provider)) {
		return next(new CustomError(ResponseStatus.BAD_REQUEST));
	}

	passport.authenticate(provider, providerOptions[provider])(req, res, next);
}

export async function callbackOAuth(req, res, next) {
	const { provider } = req.params;

	if(!allowedProviders.includes(provider)) {
		return next(new CustomError(ResponseStatus.BAD_REQUEST));
	}
	
	
	passport.authenticate(provider, { session: false }, async (err, member, info) => {
		try {
			if(err){
				logger.error('Failed to callback OAuth');
				return next(err);
			}
			if(!member) {
				logger.error('Failed to callback OAuth. Invalid provider');
				return next(new CustomError(ResponseStatus.FORBIDDEN));
			}

			const inoCookie = getCookie(req, jwtConfig.inoHeader);
			const redirectUrl = getCookie(req, 'redirect_to') ?? '/';

			if(redirectUrl !== '/')
				res.clearCookie('redirect_to');

			if(inoCookie)
				await JWTTokenProvider.issuedToken(member.userId, inoCookie, res);
			else
				await JWTTokenProvider.issuedAllToken(member.userId, res);

			const targetUrl = !member.nickname
				? `/join/profile?redirect=${encodeURIComponent(redirectUrl)}`
				: decodeURIComponent(redirectUrl);

			return res.redirect(`http://localhost:3000${targetUrl}`)

		}catch (error) {
			logger.error('Failed to callback OAuth');
			next(error);
		}		
	})(req, res, next);
}

export async function patchOAuthProfile(req, res, next) {
	try {
		const userId = req.user.id;

		const profileImage = req.file ? req.file.filename : null;

		if(profileImage){
			try {
				await profileResize(profileImage);
			}catch(error) {
				console.error('profileResize error : ', error);
				next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
			}
		}

		await patchOAuthProfileService(userId, req.body, profileImage);

		res.success();
	}catch(error) {
		logger.error('Failed to patchOauthProfile');
		next(error);
	}
}

export async function getProfileDisplay(req, res, next) {
	const imageName = req.params.imageName;

	try {
		const{ path, contentType } = await getProfileImageDisplayService(imageName);

		res.locals.imagePayload = {
			filePath: path,
			contentType,
			errorContext: 'Profile'
		}

		next();
	}catch(error) {
		next(error);
	}
}