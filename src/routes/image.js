import express from 'express';
import { getImageDisplay } from '#controllers/imageFileController.js';

const router = express.Router();

router.get('/display/:imageName', getImageDisplay);

export default router;