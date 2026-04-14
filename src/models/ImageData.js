import Sequelize from "sequelize";

export default class ImageData extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                imageName: {
                    type: Sequelize.STRING(255),
                    allowNull: false,
                    primaryKey: true,
                    field: 'image_name'
                },
                imageId: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    field: 'image_id'
                },
                originName: {
                    type: Sequelize.STRING(255),
                    allowNull: false,
                    field: 'origin_name',
                },
                imageStep: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    field: 'image_step',
                }
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'ImageData',
                tableName: 'image_data',
                paranoid: false,
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
        db.ImageData.belongsTo(db.ImageBoard, {
            foreignKey: 'imageId',
            targetKey: 'id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    }
}