import Sequelize from "sequelize";

export default class Board extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                boardNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                },
                userId: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                },
                boardTitle: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                },
                boardContent: {
                    type: Sequelize.TEXT,
                    allowNull: true,
                },
                boardDate: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                },
                boardGroupNo: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                },
                boardUpperNo: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                },
				boardIndent: {
					type: Sequelize.INTEGER,
					allowNull: false,
					defaultValue: 1,
				},
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'Board',
                tableName: 'hierarchicalBoard',
                paranoid: false,
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
        db.Board.belongsTo(db.Member, {
            foreignKey: 'userId',
            targetKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    }
}