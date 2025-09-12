import express from 'express';
import { isLoggedIn } from '#middleware/authMiddleware.js';
import {
	getBoardList,
	getBoardDetail,
	postBoard,
	patchBoardDetailData,
	patchBoard,
	deleteBoard,
	getReplyDetail,
	postBoardReply
} from '#controllers/boardController.js';
import { validate } from '#middleware/validateMiddleware.js';
import {
	boardListSearchValidator,
	postBoardValidator,
	patchBoardValidator,
	postBoardReplyValidator,
} from '#validators/boardValidator.js';

const router = express.Router();

router.get('/', validate(boardListSearchValidator, 'query'), getBoardList);
router.get('/:boardNo', getBoardDetail);
router.post('/', isLoggedIn, validate(postBoardValidator), postBoard);
router.get('/patch-detail/:boardNo', isLoggedIn, patchBoardDetailData);
router.patch('/:boardNo', isLoggedIn, validate(patchBoardValidator), patchBoard);
router.delete('/:boardNo', isLoggedIn, deleteBoard);
router.get('/reply/:boardNo', isLoggedIn, getReplyDetail);
router.post('/reply', isLoggedIn, validate(postBoardReplyValidator), postBoardReply);


export default router;