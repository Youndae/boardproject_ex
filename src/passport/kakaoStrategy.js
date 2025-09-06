import { Strategy as KakaoStrategy } from 'passport-kakao';
import { oAuthCallback, parsers } from '@services/oAuth/oAuthService.js';

const kakaoStrategy = new KakaoStrategy({
		clientID: process.env.KAKAO_ID,
		callbackURL: '',
	},
	oAuthCallback('kakao', parsers.kakao)
);

export default kakaoStrategy;