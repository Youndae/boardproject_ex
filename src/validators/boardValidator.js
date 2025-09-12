import { z } from "zod";


const boardTitleValidator = z.string()
								.min(1, { message: '제목은 1자 이상이어야 합니다.'})
								.max(100, { message: '제목은 100자 이하이어야 합니다.'});

const boardContentValidator = z.string()
								.min(1, { message: '내용은 1자 이상이어야 합니다.'})
								.max(5000, { message: '내용은 5000자 이하이어야 합니다.'});

const searchTypeValidator = z.enum(['t', 'c', 'tc', 'u'], { message: '검색 타입은 t, c, tc, u 중 하나여야 합니다.'});

export const boardListSearchValidator = z.object({
	keyword: z.string()
				.min(2, { message: '검색어는 2자 이상이어야 합니다.'})
				.max(50, { message: '검색어는 50자 이하이어야 합니다.'})
				.optional(),
	searchType: searchTypeValidator.optional(),
	pageNum: z.number().int().positive().optional(),
});

export const postBoardValidator = z.object({
	boardTitle: boardTitleValidator,
	boardContent: boardContentValidator,
});

export const patchBoardValidator = z.object({
	boardTitle: boardTitleValidator,
	boardContent: boardContentValidator,
});

export const postBoardReplyValidator = z.object({
	boardTitle: boardTitleValidator,
	boardContent: boardContentValidator,
	boardGroupNo: z.number().int().positive(),
	boardIndent: z.number().int().positive(),
	boardUpperNo: z.string()
				.regex(
					/^(\d+,)*\d+$/, 
					{ message: 'boardUpperNo의 구조가 올바르지 않습니다.'}
				),
});