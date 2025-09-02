import Sequelize from 'sequelize';

export default class Auth extends Sequelize.Model {
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
                    type: Sequelize.STRING(50),
                    allowNull: false,
                },
                auth: {
                    type: Sequelize.STRING(20),
                    allowNull: false,
                    defaultValue: 'ROLE_MEMBER',
                },
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'Auth',
                tableName: 'auth',
                paranoid: false,
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
        db.Auth.belongsTo(db.Member, {
            foreignKey: 'userId',
            targetKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    }
}