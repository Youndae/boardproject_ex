import express from 'express';
import { isLoggedIn, isNotLoggedIn } from '@middleware/authMiddleware.js';
import { MemberController } from '@controllers/memberController.js';
import { ResponseStatusCodes } from '@constants/responseStatus.js';
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

	return res.status(ResponseStatusCodes.OK)
		.json({
			loginStatus,
		});
});
router.post('/join', isNotLoggedIn, validate(registerValidator), profileUpload, MemberController.join);
router.get('/check-id', isNotLoggedIn, validate(checkIdValidator), MemberController.checkId);
router.get('/check-nickname', validate(checkNicknameValidator), MemberController.checkNickname);
router.post('/login', isNotLoggedIn, validate(loginValidator), MemberController.login);
router.post('/logout', isLoggedIn, MemberController.logout);
router.patch('/profile', isLoggedIn, validate(patchProfileValidator), profileUpload, MemberController.profile);
router.get('/profile', isLoggedIn, MemberController.profile);

export default router;