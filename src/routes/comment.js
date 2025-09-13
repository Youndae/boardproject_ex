import express from "express";
import { isLoggedIn } from "#middleware/authMiddleware.js";
import {
	getBoardCommentList,
	getImageBoardCommentList,
	postBoardComment,
	postImageBoardComment,
	deleteComment,
	postBoardReplyComment,
	postImageBoardReplyComment
} from "#controllers/commentController.js";
import { validate } from "#middleware/validateMiddleware.js";
import { postCommentValidator, postReplyCommentValidator } from "#validators/commentValidator.js";

const router = express.Router();

router.get('/board', getBoardCommentList);
router.get('/image', getImageBoardCommentList);
router.post('/board/:boardNo', isLoggedIn, validate(postCommentValidator), postBoardComment);
router.post('/image/:imageNo', isLoggedIn, validate(postCommentValidator), postImageBoardComment);
router.delete('/:commentNo', isLoggedIn, deleteComment);
router.post('/board/:boardNo/reply', isLoggedIn, validate(postReplyCommentValidator), postBoardReplyComment);
router.post('/image/:imageNo/reply', isLoggedIn, validate(postReplyCommentValidator), postImageBoardReplyComment);

export default router;