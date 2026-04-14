import { z } from "zod";

const commentContentValidator = z.string()
								.min(1, { message: '댓글 내용은 1자 이상이어야 합니다.'})
								.max(500, { message: '댓글 내용은 500자 이하이어야 합니다.'});


export const postCommentValidator = z.object({
	content: commentContentValidator
});

export const postReplyCommentValidator = z.object({
	content: commentContentValidator,
});