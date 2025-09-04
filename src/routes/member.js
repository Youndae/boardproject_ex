import express from 'express';
import passport from 'passport';
import { isLoggedIn, isNotLoggedIn } from '@middleware/authMiddleware.js';
import { MemberController } from '@controllers/memberController.js';
import { ResponseStatusCodes } from '@constants/responseStatus.js';

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

router.post('/join', isNotLoggedIn, MemberController.join);
router.get('/check-id', isNotLoggedIn, MemberController.checkId);
router.get('/check-nickname', MemberController.checkNickname);
router.post('/login', isNotLoggedIn, MemberController.login);
router.post('/logout', isLoggedIn, MemberController.logout);
router.patch('/profile', isLoggedIn, MemberController.profile);
router.get('/profile', isLoggedIn, MemberController.profile);

export default router;