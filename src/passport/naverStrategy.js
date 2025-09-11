import { Strategy as NaverStrategy } from 'passport-naver';
import { oAuthCallback, parsers } from '#services/oAuth/oAuthService.js';

const naverStrategy = new NaverStrategy({
		clientID: process.env.NAVER_ID,
		clientSecret: process.env.NAVER_SECRET,
		callbackURL: process.env.NAVER_CALLBACK,
	},
	oAuthCallback('naver', parsers.naver)
)

export default naverStrategy;