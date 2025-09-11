import express from 'express';
import { isLoggedIn, isNotLoggedIn } from '@middleware/authMiddleware.js';
import { 
	register,
	checkId,
	checkNickname,
	login,
	logout,
	patchProfile,
	getProfile
 } from '@controllers/memberController.js';
import { ResponseStatusCode } from '@constants/responseStatus.js';
import { validate } from '@middleware/validateMiddleware.js';
import { 
	registerValidator, 
	checkIdValidator, 
	checkNicknameValidator, 
	loginValidator, 
	patchProfileValidator 
} from '@validators/memberValidator.js';
import { profileUpload } from '@middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/check-login', (req, res, next) => {
	let loginStatus = false;

	if(req.userId)
		loginStatus = true;

	return res.status(ResponseStatusCode.OK)
		.json({
			loginStatus,
		});
});
router.post('/join', isNotLoggedIn, profileUpload, validate(registerValidator), register);
router.get('/check-id', isNotLoggedIn, validate(checkIdValidator, 'query'), checkId);
router.get('/check-nickname', validate(checkNicknameValidator, 'query'), checkNickname);
router.post('/login', isNotLoggedIn, validate(loginValidator), login);
router.post('/logout', isLoggedIn, logout);
router.patch('/profile', isLoggedIn, profileUpload, validate(patchProfileValidator), patchProfile);
router.get('/profile', isLoggedIn, getProfile);

export default router;