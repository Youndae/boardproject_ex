import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { MemberRepository } from '@repositories/memberRepository';

const localStrategy = new LocalStrategy({
		usernameField: 'userId',
		passwordField: 'userPw',
		session: false,
	},
	async (userId, userPw, done) => {
		try {
			const member = await MemberRepository.findMemberByUserId(userId);
			if(!member) 
				return done(null, false, { message: 'Authenticate Failed' });
			
			const isMatch = await bcrypt.compare(userPw, member.userPw);
			if(!isMatch)
				return done(null, false, { message: 'Authenticate Failed' });

			return done(null, member);
		} catch(error) {
			return done(error);
		}
	}
);

export default localStrategy;