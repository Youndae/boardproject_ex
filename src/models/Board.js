import Sequelize from "sequelize";

export default class Board extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
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
                },
                groupNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                    field: 'group_no',
                },
                upperNo: {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                    field: 'upper_no',
                },
				indent: {
					type: Sequelize.INTEGER,
					allowNull: false,
					defaultValue: 1,
				},
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'Board',
                tableName: 'board',
                paranoid: false,
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
        db.Board.belongsTo(db.Member, {
            foreignKey: 'userId',
            targetKey: 'id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            as: 'Member'
        });
    }
}