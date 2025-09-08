import { AuthRepository } from '@repositories/authRepository.js';
import { sequelize, Member, Auth } from '@models/index.js';
import CustomError from '@errors/customError.js';
import { ResponseStatus } from '@constants/responseStatus.js';

describe('authRepository test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });
	});

	afterAll(async () => {
		await sequelize.close();
	});
	
	afterEach(async () => {
		await Member.destroy({ where: {} });
		await Auth.destroy({ where: {} });
	});

	describe('createMemberAUth', () => {
		it('정상 생성', async() => {
			Member.create({
				userId: 'tester',
				userPw: 'testerPasword',
				email: 'tester@tester.com',
				userName: 'testerName',
				nickName: 'testerNickName',
				profileThumbnail: 'testerProfileThumbnail.jpg',
				provider: 'local',
			});

			await AuthRepository.createMemberAuth('tester', 'ROLE_MEMBER');

			const auth = await Auth.findOne({ where: { userId: 'tester' } });

			expect(auth).toBeDefined();
			expect(auth.userId).toBe('tester');
			expect(auth.auth).toBe('ROLE_MEMBER');
		});

		it('아이디와 일치하는 사용자 정보 없음', async() => {
			try {
				await AuthRepository.createMemberAuth('nonexistent', 'ROLE_MEMBER');
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});
	})
})