import Sequelize from "sequelize";

export default class ImageBoard extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                imageNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true
                },
                userId: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                },
                imageTitle: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                },
                imageContent: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                },
                imageDate: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                }
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'ImageBoard',
                tableName: 'imageBoard',
                paranoid: false,
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
        db.ImageBoard.belongsTo(db.Member, {
            foreignKey: 'userId',
            targetKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        db.ImageBoard.hasMany(db.ImageData, {
            foreignKey: 'imageNo',
            sourceKey: 'imageNo',
            as: 'imageDatas',
        });
    }
}