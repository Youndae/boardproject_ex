import { z } from 'zod';

const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const userIdValidator = z.string()
						.min(4, { message: '아이디는 최소 4자 이상이어야 합니다.'})
						.max(20);

const nicknameValidator = z.string()
							.min(2, { message: '닉네임은 최소 2자 이상이어야 합니다.'})
							.max(50);

const pwValidator = z.string()
			.min(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.'})
			.regex(
				pwRegex, 
				{ message: '영문, 숫자, 특수문자를 포함한 8자 이상의 비밀번호를 입력해주세요.'}
			);

export const registerValidator = z.object({
	userId: userIdValidator,
	userPw: pwValidator,
	email: z.string().email({ message: '이메일 형식에 맞지 않습니다.'}),
	username: z.string().min(2, { message: '이름은 최소 2자 이상이어야 합니다.'}).max(50),
	nickname: nicknameValidator.optional().nullable(),
}).strict();

export const checkIdValidator = z.object({
	userId: userIdValidator,
}).strict();

export const checkNicknameValidator = z.object({
	nickname: nicknameValidator,
}).strict();

export const loginValidator = z.object({
	userId: userIdValidator,
	userPw: pwValidator,
}).strict();

export const patchProfileValidator = z.object({
	nickname: nicknameValidator.optional().nullable(),
	deleteProfile: z.string().optional().nullable(),
}).strict();