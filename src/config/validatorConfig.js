import { z } from 'zod';


z.config({
	customError: (issue) => {
		switch (issue.code) {
			case 'invalid_type':
			return { message: `Invalid type. ${issue.received} expected ${issue.expected}`};
			case 'too_small':
				return { message: `최소 ${issue.minimum}자 이상이어야 합니다.`}
			case 'too_big':
				return { message: `최대 ${issue.maximum}자 이하이어야 합니다.`}
			default:
				return { message: issue.defaultError };
		}
	}
})

// create Zod instance
export { z };