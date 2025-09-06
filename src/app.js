import 'module-alias/register';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import morgan from 'morgan';
import dotenv from 'dotenv-flow';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import TokenMiddleware from '@middleware/tokenMiddleware.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
// TODO: Router

import { sequelize } from './models';
import passportConfig from './passport';
import memberRouter from './routes/member.js';

const app = express();
passportConfig();
app.use(TokenMiddleware);

app.set('port', process.env.PORT || 8081);

sequelize.sync({ force: false })
    .then(() => {
        console.log('connected Database');
    })
    .catch((err) => {
        console.error('Failed to Database connect');
        console.error(err);
    });

app.use(morgan('dev'));
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(passport.initialize());

// TODO: Router 등록
app.use('/member', memberRouter);


// 404
app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

// error 처리
app.use((err, req, res, next) => {
    console.error(err);

    const status = err.status || 500;
    const message = err.message || 'Server Error';

    res.status(status).json({
        status,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
});

export default app;