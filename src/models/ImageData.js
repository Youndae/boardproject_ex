import Sequelize from "sequelize";

export default class ImageData extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                imageName: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                    primaryKey: true,
                },
                imageNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                },
                oldName: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                imageStep: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                }
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'ImageData',
                tableName: 'imageData',
                paranoid: false,
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
        db.ImageData.belongsTo(db.ImageBoard, {
            foreignKey: 'imageNo',
            targetKey: 'imageNo',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    }
}