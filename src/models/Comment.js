import Sequelize from 'sequelize';

export default class Comment extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                },
                boardId: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                    field: 'board_id'
                },
                imageId: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                    field: 'image_board_id'
                },
                userId: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    field: 'user_id'
                },
                content: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                },
                groupNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                    field: 'group_no',
                },
                indent: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 1,
                },
                upperNo: {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                    field: 'upper_no',
                },
                createdAt: {
                    type: Sequelize.DATE(3),
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    field: 'created_at',
                },
                deletedAt: {
                    type: Sequelize.DATE(3),
                    allowNull: true,
                    field: 'deleted_at'
                }
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'Comment',
                tableName: 'comment',
                paranoid: true,
                deletedAt: 'deletedAt',
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
        db.Comment.belongsTo(db.Board, {
            foreignKey: 'boardId',
            targetKey: 'id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            as: 'Board',
        });

        db.Comment.belongsTo(db.ImageBoard, {
            foreignKey: 'imageId',
            targetKey: 'id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            as: 'ImageBoard',
        });

        db.Comment.belongsTo(db.Member, {
            foreignKey: 'userId',
            targetKey: 'id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            as: 'Member',
        });
    }
}