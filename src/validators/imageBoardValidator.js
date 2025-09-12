import { z } from "zod";

const boardTitleValidator = z.string()
								.min(1, { message: '제목은 1자 이상이어야 합니다.'})
								.max(100, { message: '제목은 100자 이하이어야 합니다.'});

const boardContentValidator = z.string()
								.min(1, { message: '내용은 1자 이상이어야 합니다.'})
								.max(5000, { message: '내용은 5000자 이하이어야 합니다.'});

const searchTypeValidator = z.enum(['t', 'c', 'tc', 'u'], { message: '검색 타입은 t, c, tc, u 중 하나여야 합니다.'});

export const imageBoardListSearchValidator = z.object({
	keyword: z.string()
				.min(2, { message: '검색어는 2자 이상이어야 합니다.'})
				.max(50, { message: '검색어는 50자 이하이어야 합니다.'})
				.optional(),
	searchType: searchTypeValidator.optional(),
	pageNum: z.number().int().positive().optional(),
});

export const postImageBoardValidator = z.object({
	imageTitle: boardTitleValidator,
	imageContent: boardContentValidator,
});

export const patchImageBoardValidator = z.object({
	imageTitle: boardTitleValidator,
	imageContent: boardContentValidator,
});