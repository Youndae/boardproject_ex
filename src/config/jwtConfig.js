const required = (value, name) => {
	if(!value || String(value).trim() === '')
		throw new Error(`Missing required JWT config: ${name}`);

	return value;
}

export const jwtConfig = {
	accessSecret: required(process.env.ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
	refreshSecret: required(process.env.REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
	
	accessExpire: required(process.env.ACCESS_EXPIRE, 'JWT_ACCESS_EXPIRE'),
	refreshExpire: required(process.env.REFRESH_EXPIRE, 'JWT_REFRESH_EXPIRE'),
	inoExpire: required(process.env.INO_EXPIRE, 'JWT_INO_EXPIRE'),
	
	accessHeader: required(process.env.ACCESS_HEADER, 'JWT_ACCESS_HEADER'),
	refreshHeader: required(process.env.REFRESH_HEADER, 'JWT_REFRESH_HEADER'),
	inoHeader: required(process.env.INO_HEADER, 'JWT_INO_HEADER'),

	accessKeyPrefix: required(process.env.ACCESS_KEY_PREFIX, 'JWT_ACCESS_KEY_PREFIX'),
	refreshKeyPrefix: required(process.env.REFRESH_KEY_PREFIX, 'JWT_REFRESH_KEY_PREFIX'),

	tokenPrefix: required(process.env.TOKEN_PREFIX, 'JWT_TOKEN_PREFIX'),
};

export const ensureJwtConfig = () => {
	// 필수값 재검증
	required(jwtConfig.accessSecret, 'JWT_ACCESS_SECRET');
	required(jwtConfig.refreshSecret, 'JWT_REFRESH_SECRET');

	return jwtConfig;
};