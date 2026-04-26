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
router.get('/:id', getBoardDetail);
router.post('/', isLoggedIn, validate(postBoardValidator), postBoard);
router.get('/patch/:id', isLoggedIn, patchBoardDetailData);
router.patch('/:id', isLoggedIn, validate(patchBoardValidator), patchBoard);
router.delete('/:id', isLoggedIn, deleteBoard);
router.get('/reply/:id', isLoggedIn, getReplyDetail);
router.post('/reply/:id', isLoggedIn, validate(postBoardReplyValidator), postBoardReply);


export default router;