//TODO: import services
import {
	registerService,
	checkIdService,
	checkNicknameService,
	patchProfileService,
	getProfileService
} from "@services/member/memberService.js"
import { profileResize } from "@utils/resize.js"
import logger from "@config/loggerConfig.js"
import CustomError from "@errors/customError.js"
import { ResponseStatus, ResponseStatusCode } from "@constants/responseStatus.js"
import { JWTTokenProvider } from "@services/jwt/jwtTokenProvider.js"
import { getCookie } from "@utils/cookieUtils.js"
import { jwtConfig } from "@config/jwtConfig.js"
import passport from "passport"

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
		const { userId, userPw, userName, nickName = null, email } = req.body;
		const profileImage = req.file ? req.file.filename : null;

		if(profileImage){
			try {
				await profileResize(profileImage);
			}catch(error) {
				console.error('profileResize error : ', error);
				next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
			}
		}
		await registerService(userId, userPw, userName, nickName, email, profileImage);

		return res.status(ResponseStatusCode.CREATED).json({});
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
		const result = await checkIdService(req.query.userId);

		if(result)
			throw new CustomError(ResponseStatus.CONFLICT);

		return res.status(ResponseStatusCode.OK)
			.json({
				isExist: result
			});
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
		const result = await checkNicknameService(req.userId, req.query.nickname);

		if(result)
			throw new CustomError(ResponseStatus.CONFLICT);

		return res.status(ResponseStatusCode.OK)
			.json({
				isExist: result
			});
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
	try {
		//TODO: login validation
		//TODO: passport local strategy
		passport.authenticate('local', (err, member, info) => {
			if(err){
				logger.error('Failed to login');
				return next(err);
			}
			if(!member) {
				logger.error('Failed to login. Invalid userId or userPw');
				return next(new CustomError(ResponseStatus.FORBIDDEN));
			}

			JWTTokenProvider.issuedAllToken(member.userId, res);

			return res.status(ResponseStatus.OK)
					.json({
						id: member.userId,
					});
		})(req, res, next);
	}catch (error) {
		logger.error('Failed to login');
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
 * 	status: 200
 * }
 */
export async function logout(req, res, next) {
	try {
		const inoValue = getCookie(req, jwtConfig.inoHeader);
		JWTTokenProvider.deleteTokenDataAndCookie(req.userId, inoValue, res);

		return res.status(ResponseStatus.OK).json({});
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
		const { nickname = null, deleteProfile = null } = req.body;
		const profileImage = req.file ? req.file.filename : null;

		if(profileImage){
			try {
				await profileResize(profileImage);
			}catch(error) {
				next(new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR));
			}
		}
		
		await patchProfileService(req.userId, nickname, profileImage, deleteProfile);
		
		return res.status(ResponseStatus.OK).json({});
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
		const member = await getProfileService(req.userId);
		
		return res.status(ResponseStatus.OK)
			.json({
				nickname: member.nickname,
				profileImage: member.profileThumbnail,
			});
	}catch (error) {
		logger.error('Failed to get profile');
		next(error);
	}
}