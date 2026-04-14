import Sequelize from 'sequelize';

export default class Member extends Sequelize.Model {
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
                    type: Sequelize.STRING(100),
                    allowNull: false,
                    unique: true,
                    field: 'user_id'
                },
                password: {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                },
                username: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                    field: 'user_name',
                },
				nickname: {
					type: Sequelize.STRING(50),
					allowNull: true,
                    unique: true,
				},
                email: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                },
                profile: {
                    type: Sequelize.STRING(255),
                    allowNull: true,
                },
                provider: {
                    type: Sequelize.STRING(20),
                    allowNull: false,
                    defaultValue: 'local',
                }
            }, {
                sequelize,
                timestamps: false,
                underscored: false,
                modelName: 'Member',
                tableName: 'member',
                paranoid: false,
                charset: 'utf8mb4',
                collate: 'utf8mb4_0900_ai_ci',
            }
        );
    }

    static associate(db) {
		db.Member.hasMany(db.Auth, {
			foreignKey: 'userId',
			sourceKey: 'id',
			as: 'auths',
		})
	}
}