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
			const inoValue = ino.value;
			const accessTokenValue = accessToken !== null ? accessToken.value : null;
			const refreshTokenValue = refreshToken !== null ? refreshToken.value : null;
			
			if(accessTokenValue && refreshTokenValue) {
				if(!checkTokenPrefix(accessTokenValue) || !checkTokenPrefix(refreshTokenValue)) {
					logger.warn('Invalid Token Prefix: ', { accessTokenValue, refreshTokenValue });
					JWTTokenProvider.deleteAllTokenCookie(res);
					next(new CustomError(ResponseStatus.TOKEN_INVALID));
				}else {
					try {
						const accessTokenVerifyValue = JWTTokenProvider.verifyAccessToken(accessTokenValue, inoValue, res);
						username = accessTokenVerifyValue;
					}catch(error) {
						if(error instanceof CustomError) {
							if(error.status === ResponseStatusCode.UNAUTHORIZED && error.message === ResponseStatus.TOKEN_EXPIRED.MESSAGE) {
								try {
									const decodedAccessToken = JWTTokenProvider.decodeToken(accessTokenValue).userId;
									const refreshTokenVerifyValue = JWTTokenProvider.verifyRefreshToken(refreshTokenValue, inoValue, res);

									if(decodedAccessToken === refreshTokenVerifyValue) {
										JWTTokenProvider.issuedToken(decodedAccessToken, inoValue, res);
										username = decodedAccessToken;
									}else {
										JWTTokenProvider.deleteTokenDataAndCookie(refreshTokenVerifyValue, inoValue, res);
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
			} else if(!accessTokenValue && !refreshTokenValue) {
				next();
			} else {
				let verifyValue = null;
				if(accessTokenValue) 
					verifyValue = JWTTokenProvider.decodeToken(accessTokenValue).userId;
				else if(refreshTokenValue)
					verifyValue = JWTTokenProvider.decodeToken(refreshTokenValue).userId;

				JWTTokenProvider.deleteTokenDataAndCookie(verifyValue, inoValue, res);
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