import express from "express";
import { isLoggedIn } from "#middleware/authMiddleware.js";
import {
	getBoardCommentList,
	getImageBoardCommentList,
	postBoardComment,
	postImageBoardComment,
	deleteComment,
	postCommentReply,
} from "#controllers/commentController.js";
import { validate } from "#middleware/validateMiddleware.js";
import { postCommentValidator, postReplyCommentValidator } from "#validators/commentValidator.js";

const router = express.Router();

router.get('/board', getBoardCommentList);
router.get('/image-board', getImageBoardCommentList);
router.post('/board/:targetBoardId', isLoggedIn, validate(postCommentValidator), postBoardComment);
router.post('/image-board/:targetBoardId', isLoggedIn, validate(postCommentValidator), postImageBoardComment);
router.delete('/:id', isLoggedIn, deleteComment);
router.post('/:id/reply', isLoggedIn, validate(postReplyCommentValidator), postCommentReply);

export default router;