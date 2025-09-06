import passport from 'passport';
import localStrategy from '@passport/localStrategy.js';
import googleStrategy from '@passport/googleStrategy.js';
import kakaoStrategy from '@passport/kakaoStrategy.js';
import naverStrategy from '@passport/naverStrategy.js';

export default function passportConfig() {
	passport.use(localStrategy);
	passport.use(googleStrategy);
	passport.use(kakaoStrategy);
	passport.use(naverStrategy);
}