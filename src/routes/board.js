import express from 'express';
import { isLoggedIn } from '#middleware/authMiddleware.js';

//TODO: controller import

import { validate } from '#middleware/validateMiddleware.js';

//TODO; boardValidator import

const router = express.Router();

router.get('/', getBoardList);
router.get('/:boardNo', getBoardDetail);
router.post('/', isLoggedIn, validate(postBoardValidator), postBoard);
router.get('/patch-detail/:boardNo', isLoggedIn, patchBoardDetailData);
router.patch('/:boardNo', isLoggedIn, validate(patchBoardValidator), patchBoard);
router.delete('/:boardNo', isLoggedIn, deleteBoard);
router.get('/reply/:boardNo', isLoggedIn, getReplyDetail);
router.post('/reply', isLoggedIn, validate(postBoardReplyValidator), postBoardReply);


export default router;