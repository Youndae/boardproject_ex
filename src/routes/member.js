import express from 'express';
import { isLoggedIn, isNotLoggedIn } from '#middleware/authMiddleware.js';
import {
	checkLogin,
	register,
	checkId,
	checkNickname,
	login,
	logout,
	patchProfile,
	getProfile,
	oAuthLogin,
	callbackOAuth,
	patchOAuthProfile,
	getProfileDisplay
 } from '#controllers/memberController.js';
import {memberValidate, validate} from '#middleware/validateMiddleware.js';
import { 
	registerValidator, 
	checkIdValidator, 
	checkNicknameValidator, 
	loginValidator, 
	patchProfileValidator,
	patchOAuthJoinProfileValidator
} from '#validators/memberValidator.js';
import { profileUpload } from '#middleware/uploadMiddleware.js';
import {imageRenderMiddleware} from "#middleware/imageRenderMiddleware.js";

const router = express.Router();

// /api/member
router.get('/status',isLoggedIn, checkLogin);
router.post('/join', isNotLoggedIn, profileUpload, memberValidate(registerValidator), register);
router.get('/check-id/:userId', isNotLoggedIn, validate(checkIdValidator, 'params'), checkId);
router.get('/check-nickname/:nickname', validate(checkNicknameValidator, 'params'), checkNickname);
router.post('/login', isNotLoggedIn, validate(loginValidator), login);
router.post('/logout', isLoggedIn, logout);
router.patch('/profile', isLoggedIn, profileUpload, memberValidate(patchProfileValidator), patchProfile);
router.get('/profile', isLoggedIn, getProfile);
router.get('/oauth/:provider/callback', callbackOAuth);
router.post('/oauth/join/profile', isLoggedIn, profileUpload, memberValidate(patchOAuthJoinProfileValidator), patchOAuthProfile);
router.get('/display/:imageName', getProfileDisplay, imageRenderMiddleware);

// /oauth2/authorization
router.get('/:provider', isNotLoggedIn, oAuthLogin);

export default router;