import Sequelize from 'sequelize';

export default class Member extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                userId: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                    unique: true,
                    primaryKey: true
                },
                userPw: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                },
                userName: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                },
				nickName: {
					type: Sequelize.STRING(50),
					allowNull: true,
				},
                email: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                profileThumbnail: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                },
                provider: {
                    type: Sequelize.STRING(45),
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
			sourceKey: 'userId',
			as: 'auths',
		})
	}
}