import { z } from 'zod';

const zodConfig = {
	errorMap: (issue, ctx) => {
		switch (issue.code) {
			case z.ZodIssueCode.invalid_type:
				return { message: `Invalid type. ${issue.received} expected ${issue.expected}`};
			case z.ZodIssueCode.too_small:
				return { message: `최소 ${issue.minimum}자 이상이어야 합니다.`}
			case z.ZodIssueCode.too_big:
				return { message: `최대 ${issue.maximum}자 이하이어야 합니다.`}
			default:
				return { message: ctx.defaultError };
		}
	},

	// 검증 실패시 동작 설정
	invalid_type_error: "잘못된 타입입니다.",
	required_error: "필수 필드입니다."
};

// create Zod instance
export const zod = z.setErrorMap(zodConfig.errorMap);