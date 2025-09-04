import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { oAuthCallback, parsers } from '@services/oAuth/oAuthService';

const googleStrategy = new GoogleStrategy({	
		clientID: process.env.GOOGLE_ID,
		clientSecret: process.env.GOOGLE_SECRET,
		callbackURL: '',
	},
	oAuthCallback('google', parsers.google)
)

export default googleStrategy;