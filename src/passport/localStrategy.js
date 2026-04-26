import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { MemberRepository } from '#repositories/memberRepository.js';

const localStrategy = new LocalStrategy({
		usernameField: 'userId',
		passwordField: 'password',
		session: false,
	},
	async (userId, password, done) => {
		try {
			const member = await MemberRepository.findMemberByUserIdFromLocal(userId);
			if(!member) 
				return done(null, false, { message: 'Authenticate Failed' });
			
			const isMatch = await bcrypt.compare(password, member.password);
			if(!isMatch)
				return done(null, false, { message: 'Authenticate Failed' });

			return done(null, member);
		} catch(error) {
			return done(error);
		}
	}
);

export default localStrategy;