import passport from 'passport';
import localStrategy from '@passport/localStrategy';
import googleStrategy from '@passport/googleStrategy';
import kakaoStrategy from '@passport/kakaoStrategy';
import naverStrategy from '@passport/naverStrategy';

export default function initializePassport() {
	passport.use(localStrategy);
	passport.use(googleStrategy);
	passport.use(kakaoStrategy);
	passport.use(naverStrategy);
}