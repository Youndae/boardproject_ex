import Sequelize from 'sequelize';

export default class Comment extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                commentNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                },
                boardNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                },
                imageNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                },
                userId: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                },
                commentContent: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                },
                commentDate: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                },
                commentGroupNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                },
                commentIndent: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 1,
                },
                commentUpperNo: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                },
                commentStatus: {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                }
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'Comment',
                tableName: 'comment',
                paranoid: false,
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
        db.Comment.belongsTo(db.Board, {
            foreignKey: 'boardNo',
            targetKey: 'boardNo',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        db.Comment.belongsTo(db.ImageBoard, {
            foreignKey: 'imageNo',
            targetKey: 'imageNo',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        db.Comment.belongsTo(db.Member, {
            foreignKey: 'userId',
            targetKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    }
}