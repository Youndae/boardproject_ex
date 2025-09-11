import { jwtConfig } from '@config/jwtConfig.js';
import { JWTTokenProvider } from '@services/jwt/jwtTokenProvider.js';
import logger from '@config/loggerConfig.js';
import CustomError from '@errors/customError.js';
import { getCookie } from '@utils/cookieUtils.js';
import { ResponseStatusCode, ResponseStatus } from '@constants/responseStatus.js';
import { MemberRepository } from '@repositories/memberRepository.js';


// get Token Cookie
const extractAllTokenFromCookie = (req) => {
	return {
		accessToken: getCookie(req, jwtConfig.accessHeader),
		refreshToken: getCookie(req, jwtConfig.refreshHeader),
		ino: getCookie(req, jwtConfig.inoHeader),
	};
};

const checkTokenPrefix = (tokenValue) => {
	return tokenValue.startsWith(jwtConfig.tokenPrefix);
}

export const tokenMiddleware = async (req, res, next) => {
	let username = null;
	
	try {
		const { accessToken, refreshToken, ino } = extractAllTokenFromCookie(req);

		if(ino) {
			if(accessToken && refreshToken) {
				if(!checkTokenPrefix(accessToken) || !checkTokenPrefix(refreshToken)) {
					logger.warn('Invalid Token Prefix: ', { accessToken, refreshToken });
					JWTTokenProvider.deleteAllTokenCookie(res);
					next(new CustomError(ResponseStatus.TOKEN_INVALID));
				}else {
					try {
						const accessTokenVerifyValue = await JWTTokenProvider.verifyAccessToken(accessToken, ino, res);
						username = accessTokenVerifyValue;						
					}catch(error) {
						if(error instanceof CustomError) {
							if(error.status === ResponseStatusCode.UNAUTHORIZED && error.message === ResponseStatus.TOKEN_EXPIRED.MESSAGE) {
								try {
									const decodedAccessToken = JWTTokenProvider.decodeToken(accessToken).userId;
									const refreshTokenVerifyValue = await JWTTokenProvider.verifyRefreshToken(refreshToken, ino, res);

									if(decodedAccessToken === refreshTokenVerifyValue) {
										await JWTTokenProvider.issuedToken(decodedAccessToken, ino, res);
										username = decodedAccessToken;
									}else {
										await JWTTokenProvider.deleteTokenDataAndCookie(refreshTokenVerifyValue, ino, res);
										next(new CustomError(ResponseStatus.TOKEN_STEALING));
									}
								}catch(error) {
									next(error);
								}
							}
						}else
							next(error);
					}
				}
			} else if(!accessToken && !refreshToken) {
				next();
			} else {
				let verifyValue = null;
				if(accessToken) 
					verifyValue = JWTTokenProvider.decodeToken(accessToken).userId;
				else if(refreshToken)
					verifyValue = JWTTokenProvider.decodeToken(refreshToken).userId;

				await JWTTokenProvider.deleteTokenDataAndCookie(verifyValue, ino, res);
				next(new CustomError(ResponseStatus.TOKEN_STEALING));
			}
		}

		if(username) {
			// username은 userId이기 때문에 사용자, 권한 조회 후 req에 아이디와 권한 리스트를 추가.
			const { userId, roles } = await MemberRepository.findUserIdWithRoles(username);
			req.userId = userId;
			req.roles = roles;
		}

		next();
	}catch(error) {
		next(error);
	}
}