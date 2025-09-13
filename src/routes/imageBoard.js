import express from 'express';
import { isLoggedIn } from '#middleware/authMiddleware.js';
import {
	getImageBoardList,
	getImageBoardDetail,
	postImageBoard,
	getImageBoardPatchDetail,
	patchImageBoard,
	deleteImageBoard,
	getImageBoardDisplay,
} from '#controllers/imageBoardController.js';
import { validate } from '#middleware/validateMiddleware.js';
import {
	imageBoardListSearchValidator,
	postImageBoardValidator,
	patchImageBoardValidator,
} from '#validators/imageBoardValidator.js';
import { boardUpload } from '#middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', validate(imageBoardListSearchValidator, 'query'), getImageBoardList);
router.get('/:imageNo', getImageBoardDetail);
router.post('/', isLoggedIn, boardUpload, validate(postImageBoardValidator), postImageBoard);
router.get('/patch-detail/:imageNo', isLoggedIn, getImageBoardPatchDetail);
router.patch('/:imageNo', isLoggedIn, boardUpload, validate(patchImageBoardValidator), patchImageBoard);
router.delete('/:imageNo', isLoggedIn, deleteImageBoard);
router.get('/display/:imageName', getImageBoardDisplay);

export default router;