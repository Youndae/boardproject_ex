import Sequelize from 'sequelize';
import dotenvFlow from 'dotenv-flow';

import Member from '@models/Member.js';
import Auth from '@models/Auth.js';
import Board from "@models/Board.js";
import ImageBoard from "@models/ImageBoard.js";
import ImageData from "@models/ImageData.js";
import Comment from "@models/Comment.js";

dotenvFlow.config();

const env = process.env.NODE_ENV || 'development';

const sequelize = new Sequelize(
    process.env.DB_NAME, // DB 이름
    process.env.DB_USER, // DB user
    process.env.DB_PASSWORD, // DB pw
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: env === 'development' ? console.log : false,
        timezone: '+09:00',
    }
);

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.Member = Member;
db.Auth = Auth;
db.Board = Board;
db.ImageBoard = ImageBoard;
db.ImageData = ImageData;
db.Comment = Comment;

Member.init(sequelize);
Auth.init(sequelize);
Board.init(sequelize);
ImageBoard.init(sequelize);
ImageData.init(sequelize);
Comment.init(sequelize);

Member.associate(db);
Auth.associate(db);
Board.associate(db);
ImageBoard.associate(db);
ImageData.associate(db);
Comment.associate(db);

export default db;