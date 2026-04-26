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
import { validate, imageBoardValidate } from '#middleware/validateMiddleware.js';
import { imageRenderMiddleware } from "#middleware/imageRenderMiddleware.js";
import {
	imageBoardListSearchValidator,
	postImageBoardValidator,
	patchImageBoardValidator,
} from '#validators/imageBoardValidator.js';
import { boardUpload } from '#middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', validate(imageBoardListSearchValidator, 'query'), getImageBoardList);
router.get('/:id', getImageBoardDetail);
router.post('/', isLoggedIn, boardUpload, imageBoardValidate(postImageBoardValidator), postImageBoard);
router.get('/patch/detail/:id', isLoggedIn, getImageBoardPatchDetail);
router.patch('/:id', isLoggedIn, boardUpload, imageBoardValidate(patchImageBoardValidator), patchImageBoard);
router.delete('/:id', isLoggedIn, deleteImageBoard);
router.get('/display/:imageName', getImageBoardDisplay, imageRenderMiddleware);

export default router;