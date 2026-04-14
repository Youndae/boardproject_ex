import Sequelize from "sequelize";

export default class ImageBoard extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true
                },
                userId: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    field: 'user_id',
                },
                title: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                content: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                },
                createdAt: {
                    type: Sequelize.DATE(3),
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    field: 'created_at',
                }
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'ImageBoard',
                tableName: 'image_board',
                paranoid: false,
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
        db.ImageBoard.belongsTo(db.Member, {
            foreignKey: 'userId',
            targetKey: 'id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        db.ImageBoard.hasMany(db.ImageData, {
            foreignKey: 'imageId',
            sourceKey: 'id',
            as: 'imageDatas',
        });
    }
}