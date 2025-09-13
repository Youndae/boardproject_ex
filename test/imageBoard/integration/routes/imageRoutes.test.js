import { jest } from '@jest/globals';
import CustomError from '#errors/customError.js';
import { ResponseStatus, ResponseStatusCode } from '#constants/responseStatus.js';
import { sequelize, ImageBoard, ImageData, Member, Auth } from '#models/index.js';
import request from 'supertest';
import { createTestToken } from '../../../utils/testTokenUtils.js';
import { initRedis, closeRedis } from '#config/redisConfig.js';
import { redisClient } from '#config/redisConfig.js';
import { ImageConstants } from '#constants/imageConstants.js';

await jest.unstable_mockModule('#utils/resize.js', () => ({
	boardResize: jest.fn(),
	profileResize: jest.fn(),
}));

// deleteImageFile 모듈 최소 모킹
await jest.unstable_mockModule('#utils/fileUtils.js',  () => ({
  deleteImageFile: jest.fn(),
}));

const { boardResize, profileResize } = await import('#utils/resize.js');
const { deleteImageFile } = await import('#utils/fileUtils.js');
const app = (await import('#src/app.js')).default;

const SAVE_MEMBER = [
	{
		userId: 'tester',
		userPw: 'tester1234',
		userName: 'testerName',
		nickName: 'testerNickName',
		email: 'tester@tester.com',
		profileThumbnail: 'testerProfileThumbnail.jpg',
		provider: 'local',
	},
	{
		userId: 'tester2',
		userPw: 'tester1234',
		userName: 'testerName2',
		nickName: 'testerNickName2',
		email: 'tester2@tester.com',
		profileThumbnail: 'testerProfileThumbnail2.jpg',
		provider: 'local',
	}
]

const IMAGE_TOTAL_ELEMENTS = 30;
const IMAGE_AMOUNT = 15;
const DEFAULT_USER_ID = SAVE_MEMBER[0].userId;
const WRONG_USER_ID = SAVE_MEMBER[1].userId;

describe('imageRoutes integration test', () => {
	beforeAll(async () => {
		await initRedis();
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		for(const member of SAVE_MEMBER) {
			await Member.create({
				userId: member.userId,
				userPw: member.userPw,
				userName: member.userName,
				nickName: member.nickName,
				email: member.email,
				profileThumbnail: member.profileThumbnail,
				provider: member.provider,
			});

			await Auth.create({
				userId: member.userId,
				auth: 'ROLE_MEMBER',
			});
		}
	});

	afterAll(async () => {
		await Auth.destroy({ where: {} });
		await Member.destroy({ where: {} });
		await sequelize.close();
		await closeRedis();
	});

	beforeEach(async () => {
		for(let i = 1; i <= IMAGE_TOTAL_ELEMENTS; i++) {
			await ImageBoard.create({
				imageNo: i,
				userId: DEFAULT_USER_ID,
				imageTitle: `testTitle${i}`,
				imageContent: `testContent${i}`,
			});

			for(let j = 1; j <= 3; j++) {
				await ImageData.create({
					imageNo: i,
					imageName: `testImage${i}_${j}.jpg`,
					oldName: `testImage_old_${i}_${j}.jpg`,
					imageStep: j,
				});
			}
		}
	});

	afterEach(async () => {
		await ImageData.destroy({ where: {} });
		await ImageBoard.destroy({ where: {} });
		await redisClient.flushAll();
	});

	describe('GET /image-board', () => {
		it('정상 조회', async () => {
			const res = await request(app).get('/image-board');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content).toBeDefined();
			expect(res.body.content.length).toBe(IMAGE_AMOUNT);
			expect(res.body.empty).toBe(false);
			expect(res.body.totalElements).toBe(IMAGE_TOTAL_ELEMENTS);
			expect(res.body.userStatus.loggedIn).toBe(false);
			expect(res.body.userStatus.uid).toBeUndefined();

			res.body.content.forEach((item) => {
				expect(item.imageName).toBeDefined();
			});
		});

		it('정상 조회. 로그인한 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.get('/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.length).toBe(IMAGE_AMOUNT);
			expect(res.body.empty).toBe(false);
			expect(res.body.totalElements).toBe(IMAGE_TOTAL_ELEMENTS);
			expect(res.body.userStatus.loggedIn).toBe(true);
			expect(res.body.userStatus.uid).toBe(DEFAULT_USER_ID);
		});

		it('정상 조회. 검색어 적용', async () => {
			const res = await request(app)
								.get('/image-board')
								.query({
									keyword: 'testTitle11',
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.length).toBe(1);
			expect(res.body.empty).toBe(false);
			expect(res.body.totalElements).toBe(1);
			expect(res.body.userStatus.loggedIn).toBe(false);
			expect(res.body.userStatus.uid).toBeUndefined();

			const resultData = res.body.content[0];
			expect(resultData.imageNo).toBe(11);
			expect(resultData.imageName).toBe(`testImage11_1.jpg`);
			expect(resultData.imageTitle).toBe('testTitle11');
			expect(resultData.userId).toBe(DEFAULT_USER_ID);
			expect(resultData.imageDate).toBeDefined();
		});

		it('검색어 적용. 검색어가 blank인 경우', async () => {
			const res = await request(app)
								.get('/image-board')
								.query({
									keyword: '',
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('검색어 적용. 검색어가 너무 긴 경우', async () => {
			const res = await request(app)
								.get('/image-board')
								.query({
									keyword: 'testTitle11'.repeat(50),
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		})

		it('검색어 적용. 검색 타입이 잘못 된 경우', async () => {
			const res = await request(app)
								.get('/image-board')
								.query({
									keyword: 'testTitle11',
									searchType: 'abc',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('검색어 적용. 페이지 번호가 잘못 된 경우', async () => {
			const res = await request(app)
								.get('/image-board')
								.query({
									keyword: 'testTitle11',
									searchType: 't',
									pageNum: 'abc',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('GET /image-board/:imageNo', () => {
		it('정상 조회', async () => {
			const res = await request(app)
								.get('/image-board/1');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.imageNo).toBe(1);
			expect(res.body.content.imageTitle).toBe('testTitle1');
			expect(res.body.content.imageContent).toBe('testContent1');
			expect(res.body.content.userId).toBe(DEFAULT_USER_ID);
			expect(res.body.content.imageDate).toBeDefined();
			expect(res.body.content.imageData.length).toBe(3);
			expect(res.body.content.imageData[0].imageName).toBe('testImage1_1.jpg');
			expect(res.body.content.imageData[0].oldName).toBe('testImage_old_1_1.jpg');
			expect(res.body.content.imageData[0].imageStep).toBe(1);
			expect(res.body.content.imageData[1].imageName).toBe('testImage1_2.jpg');
			expect(res.body.content.imageData[1].oldName).toBe('testImage_old_1_2.jpg');
			expect(res.body.content.imageData[1].imageStep).toBe(2);
			expect(res.body.content.imageData[2].imageName).toBe('testImage1_3.jpg');
			expect(res.body.content.imageData[2].oldName).toBe('testImage_old_1_3.jpg');
			expect(res.body.content.imageData[2].imageStep).toBe(3);

			expect(res.body.userStatus.loggedIn).toBe(false);
			expect(res.body.userStatus.uid).toBeUndefined();
		});

		it('정상 조회. 로그인한 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.get('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.imageNo).toBe(1);
			expect(res.body.content.imageTitle).toBe('testTitle1');
			expect(res.body.content.imageContent).toBe('testContent1');
			expect(res.body.content.userId).toBe(DEFAULT_USER_ID);
			expect(res.body.content.imageDate).toBeDefined();
			expect(res.body.content.imageData.length).toBe(3);
			expect(res.body.content.imageData[0].imageName).toBe('testImage1_1.jpg');
			expect(res.body.content.imageData[0].oldName).toBe('testImage_old_1_1.jpg');
			expect(res.body.content.imageData[0].imageStep).toBe(1);
			expect(res.body.content.imageData[1].imageName).toBe('testImage1_2.jpg');
			expect(res.body.content.imageData[1].oldName).toBe('testImage_old_1_2.jpg');
			expect(res.body.content.imageData[1].imageStep).toBe(2);
			expect(res.body.content.imageData[2].imageName).toBe('testImage1_3.jpg');
			expect(res.body.content.imageData[2].oldName).toBe('testImage_old_1_3.jpg');
			expect(res.body.content.imageData[2].imageStep).toBe(3);

			expect(res.body.userStatus.loggedIn).toBe(true);
			expect(res.body.userStatus.uid).toBe(DEFAULT_USER_ID);
		});

		it('데이터가 없는 경우', async () => {
			const res = await request(app)
								.get('/image-board/0');

			expect(res.status).toBe(ResponseStatusCode.NOT_FOUND);
			expect(res.body.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
		});
	});

	describe('POST /image-board', () => {
		it('정상 저장', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testTitle1')
								.field('imageContent', 'testContent1')
								.attach(
									'files',
									Buffer.from('fake'),
									'testImage1.jpg'
								)
								.attach(
									'files',
									Buffer.from('fake'),
									'testImage2.jpg'
								)
								.attach(
									'files',
									Buffer.from('fake'),
									'testImage3.jpg'
								);

			expect(res.status).toBe(ResponseStatusCode.CREATED);
			expect(res.body.imageNo).toBeDefined();

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: res.body.imageNo } });
			expect(saveImageBoard.imageTitle).toBe('testTitle1');
			expect(saveImageBoard.imageContent).toBe('testContent1');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageNo: res.body.imageNo }, order: [['imageStep', 'ASC']] });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName.startsWith(ImageConstants.BOARD_PREFIX)).toBeTruthy();
			expect(saveImageData[0].oldName).toBe('testImage1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName.startsWith(ImageConstants.BOARD_PREFIX)).toBeTruthy();
			expect(saveImageData[1].oldName).toBe('testImage2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName.startsWith(ImageConstants.BOARD_PREFIX)).toBeTruthy();
			expect(saveImageData[2].oldName).toBe('testImage3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);
		});

		it('파일이 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testTitle1')
								.field('imageContent', 'testContent1');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('파일이 너무 많은 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testTitle1')
								.field('imageContent', 'testContent1')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg')
								.attach('files', Buffer.from('fake'), 'testImage2.jpg')
								.attach('files', Buffer.from('fake'), 'testImage3.jpg')
								.attach('files', Buffer.from('fake'), 'testImage4.jpg')
								.attach('files', Buffer.from('fake'), 'testImage5.jpg')
								.attach('files', Buffer.from('fake'), 'testImage6.jpg');

			expect(res.status).toBe(ResponseStatus.TOO_MANY_FILES.CODE);
			expect(res.body.message).toBe(ResponseStatus.TOO_MANY_FILES.MESSAGE);
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.post('/image-board')
								.field('imageTitle', 'testTitle1')
								.field('imageContent', 'testContent1')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('리사이징 실패', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			boardResize.mockImplementation(() => {
				throw new Error('resize error');
			});
			const res = await request(app)
								.post('/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testTitle1')
								.field('imageContent', 'testContent1')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.INTERNAL_SERVER_ERROR);
			expect(res.body.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
		});

		it('제목이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', '')
								.field('imageContent', 'testContent1')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('제목이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testTitle1'.repeat(100))
								.field('imageContent', 'testContent1')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testTitle1')
								.field('imageContent', '')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testTitle1')
								.field('imageContent', 'testContent1'.repeat(1000))
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('GET /image-board/patch-detail/:imageNo', () => {
		it('정상 조회', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.get('/image-board/patch-detail/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.imageNo).toBe(1);
			expect(res.body.content.imageTitle).toBe('testTitle1');
			expect(res.body.content.imageContent).toBe('testContent1');
			expect(res.body.content.userId).toBeUndefined();
			expect(res.body.content.imageDate).toBeUndefined();
			expect(res.body.content.imageDatas.length).toBe(3);
			res.body.content.imageDatas.forEach((item, idx) => {
				expect(item.imageName).toBe(`testImage1_${idx + 1}.jpg`);
			})
		});

		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.get('/image-board/patch-detail/0')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.NOT_FOUND);
			expect(res.body.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(WRONG_USER_ID);
			const res = await request(app)
								.get('/image-board/patch-detail/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.get('/image-board/patch-detail/1');

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});
	});

	describe('PATCH /image-board/:imageNo', () => {
		it('정상 수정. 파일 추가, 삭제가 모두 존재하는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testUpdateTitle')
								.field('imageContent', 'testUpdateContent')
								.attach('files', Buffer.from('fake'), 'testUpdateImage1.jpg')
								.attach('files', Buffer.from('fake'), 'testUpdateImage2.jpg')
								.attach('files', Buffer.from('fake'), 'testUpdateImage3.jpg')
								.field('deleteFiles', ['testImage1_1.jpg', 'testImage1_2.jpg']);
			
			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.imageNo).toBe(1);

			const updateImageBoard = await ImageBoard.findOne({ where: { imageNo: 1 } });
			expect(updateImageBoard.imageTitle).toBe('testUpdateTitle');
			expect(updateImageBoard.imageContent).toBe('testUpdateContent');
			expect(updateImageBoard.userId).toBe(DEFAULT_USER_ID);

			const updateImageData = await ImageData.findAll({ where: { imageNo: 1 }, order: [['imageStep', 'ASC']] });
			expect(updateImageData.length).toBe(4);
			expect(updateImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(updateImageData[0].oldName).toBe('testImage_old_1_3.jpg');
			expect(updateImageData[0].imageStep).toBe(3);
			expect(updateImageData[1].imageName.startsWith(ImageConstants.BOARD_PREFIX)).toBeTruthy();
			expect(updateImageData[1].oldName).toBe('testUpdateImage1.jpg');
			expect(updateImageData[1].imageStep).toBe(4);
			expect(updateImageData[2].imageName.startsWith(ImageConstants.BOARD_PREFIX)).toBeTruthy();
			expect(updateImageData[2].oldName).toBe('testUpdateImage2.jpg');
			expect(updateImageData[2].imageStep).toBe(5);
			expect(updateImageData[3].imageName.startsWith(ImageConstants.BOARD_PREFIX)).toBeTruthy();
			expect(updateImageData[3].oldName).toBe('testUpdateImage3.jpg');
			expect(updateImageData[3].imageStep).toBe(6);

			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_1.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_2.jpg', ImageConstants.BOARD_TYPE);
		});

		it('정상 수정. 파일 추가가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testUpdateTitle')
								.field('imageContent', 'testUpdateContent')
								.field('deleteFiles', ['testImage1_1.jpg', 'testImage1_2.jpg']);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.imageNo).toBe(1);

			const updateImageBoard = await ImageBoard.findOne({ where: { imageNo: 1 } });
			expect(updateImageBoard.imageTitle).toBe('testUpdateTitle');
			expect(updateImageBoard.imageContent).toBe('testUpdateContent');
			expect(updateImageBoard.userId).toBe(DEFAULT_USER_ID);

			const updateImageData = await ImageData.findAll({ where: { imageNo: 1 }, order: [['imageStep', 'ASC']] });
			expect(updateImageData.length).toBe(1);
			expect(updateImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(updateImageData[0].oldName).toBe('testImage_old_1_3.jpg');
			expect(updateImageData[0].imageStep).toBe(3);

			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_1.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_2.jpg', ImageConstants.BOARD_TYPE);
		});

		it('정상 수정. 파일 삭제가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testUpdateTitle')
								.field('imageContent', 'testUpdateContent')
								.attach('files', Buffer.from('fake'), 'testUpdateImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.imageNo).toBe(1);

			const updateImageBoard = await ImageBoard.findOne({ where: { imageNo: 1 } });
			expect(updateImageBoard.imageTitle).toBe('testUpdateTitle');
			expect(updateImageBoard.imageContent).toBe('testUpdateContent');
			expect(updateImageBoard.userId).toBe(DEFAULT_USER_ID);

			const updateImageData = await ImageData.findAll({ where: { imageNo: 1 }, order: [['imageStep', 'ASC']] });
			expect(updateImageData.length).toBe(4);
			expect(updateImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(updateImageData[0].oldName).toBe('testImage_old_1_1.jpg');
			expect(updateImageData[0].imageStep).toBe(1);
			expect(updateImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(updateImageData[1].oldName).toBe('testImage_old_1_2.jpg');
			expect(updateImageData[1].imageStep).toBe(2);
			expect(updateImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(updateImageData[2].oldName).toBe('testImage_old_1_3.jpg');
			expect(updateImageData[2].imageStep).toBe(3);
			expect(updateImageData[3].imageName.startsWith(ImageConstants.BOARD_PREFIX)).toBeTruthy();
			expect(updateImageData[3].oldName).toBe('testUpdateImage1.jpg');
			expect(updateImageData[3].imageStep).toBe(4);
		});

		it('정상 수정. 파일 추가와 삭제가 모두 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testUpdateTitle')
								.field('imageContent', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.imageNo).toBe(1);

			const updateImageBoard = await ImageBoard.findOne({ where: { imageNo: 1 } });
			expect(updateImageBoard.imageTitle).toBe('testUpdateTitle');
			expect(updateImageBoard.imageContent).toBe('testUpdateContent');
			expect(updateImageBoard.userId).toBe(DEFAULT_USER_ID);

			const updateImageData = await ImageData.findAll({ where: { imageNo: 1 }, order: [['imageStep', 'ASC']] });
			expect(updateImageData.length).toBe(3);
			expect(updateImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(updateImageData[0].oldName).toBe('testImage_old_1_1.jpg');
			expect(updateImageData[0].imageStep).toBe(1);
			expect(updateImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(updateImageData[1].oldName).toBe('testImage_old_1_2.jpg');
			expect(updateImageData[1].imageStep).toBe(2);
			expect(updateImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(updateImageData[2].oldName).toBe('testImage_old_1_3.jpg');
			expect(updateImageData[2].imageStep).toBe(3);
		});

		it('제목이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', '')
								.field('imageContent', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('제목이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testUpdateTitle'.repeat(100))
								.field('imageContent', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testUpdateTitle')
								.field('imageContent', '');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testUpdateTitle')
								.field('imageContent', 'testUpdateContent'.repeat(1000));

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.patch('/image-board/1')
								.field('imageTitle', 'testUpdateTitle')
								.field('imageContent', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(WRONG_USER_ID);
			const res = await request(app)
								.patch('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testUpdateTitle')
								.field('imageContent', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});
		
		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/image-board/0')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('imageTitle', 'testUpdateTitle')
								.field('imageContent', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.NOT_FOUND);
			expect(res.body.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
		});
	});

	describe('DELETE /image-board/:imageNo', () => {
		it('정상 삭제', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.delete('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.NO_CONTENT);
			expect(res.body).toEqual({});

			const deleteImageBoard = await ImageBoard.findOne({ where: { imageNo: 1 } });
			expect(deleteImageBoard).toBeNull();

			const deleteImageData = await ImageData.findAll({ where: { imageNo: 1 } });
			expect(deleteImageData.length).toBe(0);

			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_1.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_2.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_3.jpg', ImageConstants.BOARD_TYPE);
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.delete('/image-board/1');

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(WRONG_USER_ID);
			const res = await request(app)
								.delete('/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);

			const deleteImageBoard = await ImageBoard.findOne({ where: { imageNo: 1 } });
			expect(deleteImageBoard).not.toBeNull();

			const deleteImageData = await ImageData.findAll({ where: { imageNo: 1 }, order: [['imageStep', 'ASC']] });
			expect(deleteImageData.length).toBe(3);

			expect(deleteImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(deleteImageData[0].oldName).toBe('testImage_old_1_1.jpg');
			expect(deleteImageData[0].imageStep).toBe(1);
			expect(deleteImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(deleteImageData[1].oldName).toBe('testImage_old_1_2.jpg');
			expect(deleteImageData[1].imageStep).toBe(2);
			expect(deleteImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(deleteImageData[2].oldName).toBe('testImage_old_1_3.jpg');
			expect(deleteImageData[2].imageStep).toBe(3);

			expect(deleteImageFile).not.toHaveBeenCalled();
		});
	});
})