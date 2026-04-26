import { jest } from '@jest/globals';
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
	deleteBoardImageFromFiles: jest.fn(),
	deleteBoardImageFromNames: jest.fn(),
}));

const { boardResize, profileResize } = await import('#utils/resize.js');
const { deleteImageFile, deleteBoardImageFromFiles, deleteBoardImageFromNames } = await import('#utils/fileUtils.js');
const app = (await import('#src/app.js')).default;

const SAVE_MEMBER = [
	{
		id: 1,
		userId: 'tester',
		password: 'tester1234',
		username: 'testerName',
		nickname: 'testerNickName',
		email: 'tester@tester.com',
		profile: 'testerProfileThumbnail.jpg',
		provider: 'local',
	},
	{
		id: 2,
		userId: 'tester2',
		password: 'tester1234',
		username: 'testerName2',
		nickname: 'testerNickName2',
		email: 'tester2@tester.com',
		profile: 'testerProfileThumbnail2.jpg',
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
			await Member.create(member);

			await Auth.create({
				userId: member.id,
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
				id: i,
				userId: SAVE_MEMBER[0].id,
				title: `testTitle${i}`,
				content: `testContent${i}`,
			});

			for(let j = 1; j <= 3; j++) {
				await ImageData.create({
					imageId: i,
					imageName: `testImage${i}_${j}.jpg`,
					originName: `testImage_old_${i}_${j}.jpg`,
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
			const res = await request(app).get('/api/image-board');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content).toBeDefined();
			expect(res.body.content.items.length).toBe(IMAGE_AMOUNT);
			expect(res.body.content.isEmpty).toBe(false);
			expect(res.body.content.totalPages).toBe(Math.ceil(IMAGE_TOTAL_ELEMENTS / IMAGE_AMOUNT));
			expect(res.body.content.currentPage).toBe(1);

			res.body.content.items.forEach((item) => {
				expect(item.imageName).toBeDefined();
			});
		});

		it('정상 조회. 로그인한 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.get('/api/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content).toBeDefined();
			expect(res.body.content.items.length).toBe(IMAGE_AMOUNT);
			expect(res.body.content.isEmpty).toBe(false);
			expect(res.body.content.totalPages).toBe(Math.ceil(IMAGE_TOTAL_ELEMENTS / IMAGE_AMOUNT));
			expect(res.body.content.currentPage).toBe(1);

			res.body.content.items.forEach((item) => {
				expect(item.imageName).toBeDefined();
			});
		});

		it('정상 조회. 검색어 적용', async () => {
			const res = await request(app)
								.get('/api/image-board')
								.query({
									keyword: 'testTitle11',
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.items.length).toBe(1);
			expect(res.body.content.isEmpty).toBe(false);
			expect(res.body.content.totalPages).toBe(1);
			expect(res.body.content.currentPage).toBe(1);

			const resultData = res.body.content.items[0];
			expect(resultData.id).toBe(11);
			expect(resultData.title).toBe('testTitle11');
			expect(resultData.imageName).toBe(`testImage11_1.jpg`);
		});

		it('검색어 적용. 검색어가 blank인 경우', async () => {
			const res = await request(app)
								.get('/api/image-board')
								.query({
									keyword: '',
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('검색어 적용. 검색어가 너무 긴 경우', async () => {
			const res = await request(app)
								.get('/api/image-board')
								.query({
									keyword: 'testTitle11'.repeat(50),
									searchType: 't',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		})

		it('검색어 적용. 검색 타입이 잘못 된 경우', async () => {
			const res = await request(app)
								.get('/api/image-board')
								.query({
									keyword: 'testTitle11',
									searchType: 'abc',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('검색어 적용. 페이지 번호가 잘못 된 경우', async () => {
			const res = await request(app)
								.get('/api/image-board')
								.query({
									keyword: 'testTitle11',
									searchType: 't',
									page: 'abc',
								});

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('GET /image-board/:id', () => {
		it('정상 조회', async () => {
			const res = await request(app)
								.get('/api/image-board/1');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.id).toBeUndefined();
			expect(res.body.content.title).toBe('testTitle1');
			expect(res.body.content.content).toBe('testContent1');
			expect(res.body.content.writer).toBe(SAVE_MEMBER[0].nickname);
			expect(res.body.content.writerId).toBe(SAVE_MEMBER[0].userId);
			expect(res.body.content.createdAt).toBeDefined();
			expect(res.body.content.imageDataList.length).toBe(3);
			expect(res.body.content.imageDataList[0]).toBe('testImage1_1.jpg');
			expect(res.body.content.imageDataList[1]).toBe('testImage1_2.jpg');
			expect(res.body.content.imageDataList[2]).toBe('testImage1_3.jpg');
		});

		it('데이터가 없는 경우', async () => {
			const res = await request(app)
									.get('/api/image-board/100');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('POST /image-board', () => {
		it('정상 저장', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/api/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testTitle1')
								.field('content', 'testContent1')
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
			expect(res.body.content).toBeDefined();

			const saveImageBoard = await ImageBoard.findOne({ where: { id: res.body.content } });
			expect(saveImageBoard.title).toBe('testTitle1');
			expect(saveImageBoard.content).toBe('testContent1');
			expect(saveImageBoard.userId).toBe(SAVE_MEMBER[0].id);

			const saveImageData = await ImageData.findAll({ where: { imageId: res.body.content }, order: [['imageStep', 'ASC']] });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName).toBeDefined();
			expect(saveImageData[0].originName).toBe('testImage1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName).toBeDefined();
			expect(saveImageData[1].originName).toBe('testImage2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName).toBeDefined();
			expect(saveImageData[2].originName).toBe('testImage3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);
		});

		it('파일이 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/api/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testTitle1')
								.field('content', 'testContent1');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('파일이 너무 많은 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/api/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testTitle1')
								.field('content', 'testContent1')
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
								.post('/api/image-board')
								.field('title', 'testTitle1')
								.field('content', 'testContent1')
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
								.post('/api/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testTitle1')
								.field('content', 'testContent1')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.INTERNAL_SERVER_ERROR);
			expect(res.body.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);

			expect(boardResize).toHaveBeenCalled();
			expect(deleteBoardImageFromFiles).toHaveBeenCalled();
		});

		it('제목이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/api/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', '')
								.field('content', 'testContent1')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);

			expect(boardResize).not.toHaveBeenCalled();
			expect(deleteBoardImageFromFiles).toHaveBeenCalled();
		});

		it('제목이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/api/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testTitle1'.repeat(100))
								.field('content', 'testContent1')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);

			expect(boardResize).not.toHaveBeenCalled();
			expect(deleteBoardImageFromFiles).toHaveBeenCalled();
		});

		it('내용이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/api/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testTitle1')
								.field('content', '')
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);

			expect(boardResize).not.toHaveBeenCalled();
			expect(deleteBoardImageFromFiles).toHaveBeenCalled();
		});

		it('내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.post('/api/image-board')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testTitle1')
								.field('content', 'testContent1'.repeat(1000))
								.attach('files', Buffer.from('fake'), 'testImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);

			expect(boardResize).not.toHaveBeenCalled();
			expect(deleteBoardImageFromFiles).toHaveBeenCalled();
		});
	});

	describe('GET /image-board/patch/detail/:id', () => {
		it('정상 조회', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.get('/api/image-board/patch/detail/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content.id).toBeUndefined();
			expect(res.body.content.title).toBe('testTitle1');
			expect(res.body.content.content).toBe('testContent1');
			expect(res.body.content.userId).toBeUndefined();
			expect(res.body.content.createdAt).toBeUndefined();
			expect(res.body.content.imageList.length).toBe(3);
			res.body.content.imageList.forEach((item, idx) => {
				expect(item.imageName).toBe(`testImage1_${idx + 1}.jpg`);
				expect(item.originName).toBe(`testImage_old_1_${idx + 1}.jpg`);
				expect(item.imageStep).toBe(idx + 1);
			})
		});

		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.get('/api/image-board/patch/detail/9999')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(WRONG_USER_ID);
			const res = await request(app)
								.get('/api/image-board/patch/detail/1')
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
								.get('/api/image-board/patch/detail/1');

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});
	});

	describe('PATCH /image-board/:id', () => {
		it('정상 수정. 파일 추가, 삭제가 모두 존재하는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testUpdateTitle')
								.field('content', 'testUpdateContent')
								.attach('files', Buffer.from('fake'), 'testUpdateImage1.jpg')
								.attach('files', Buffer.from('fake'), 'testUpdateImage2.jpg')
								.attach('files', Buffer.from('fake'), 'testUpdateImage3.jpg')
								.field('deleteFiles', ['testImage1_1.jpg', 'testImage1_2.jpg']);
			
			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content).toBe(1);

			const updateImageBoard = await ImageBoard.findOne({ where: { id: 1 } });
			expect(updateImageBoard.title).toBe('testUpdateTitle');
			expect(updateImageBoard.content).toBe('testUpdateContent');
			expect(updateImageBoard.userId).toBe(SAVE_MEMBER[0].id);

			const updateImageData = await ImageData.findAll({ where: { imageId: 1 }, order: [['imageStep', 'ASC']] });
			expect(updateImageData.length).toBe(4);
			expect(updateImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(updateImageData[0].originName).toBe('testImage_old_1_3.jpg');
			expect(updateImageData[0].imageStep).toBe(3);
			expect(updateImageData[1].imageName).toBeDefined();
			expect(updateImageData[1].originName).toBe('testUpdateImage1.jpg');
			expect(updateImageData[1].imageStep).toBe(4);
			expect(updateImageData[2].imageName).toBeDefined();
			expect(updateImageData[2].originName).toBe('testUpdateImage2.jpg');
			expect(updateImageData[2].imageStep).toBe(5);
			expect(updateImageData[3].imageName).toBeDefined();
			expect(updateImageData[3].originName).toBe('testUpdateImage3.jpg');
			expect(updateImageData[3].imageStep).toBe(6);

			expect(boardResize).toHaveBeenCalled();
			expect(deleteBoardImageFromNames).toHaveBeenCalledWith(['testImage1_1.jpg', 'testImage1_2.jpg']);
		});

		it('정상 수정. 파일 추가가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testUpdateTitle')
								.field('content', 'testUpdateContent')
								.field('deleteFiles', ['testImage1_1.jpg', 'testImage1_2.jpg']);

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content).toBe(1);

			const updateImageBoard = await ImageBoard.findOne({ where: { id: 1 } });
			expect(updateImageBoard.title).toBe('testUpdateTitle');
			expect(updateImageBoard.content).toBe('testUpdateContent');
			expect(updateImageBoard.userId).toBe(SAVE_MEMBER[0].id);

			const updateImageData = await ImageData.findAll({ where: { imageId: 1 }, order: [['imageStep', 'ASC']] });
			expect(updateImageData.length).toBe(1);
			expect(updateImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(updateImageData[0].originName).toBe('testImage_old_1_3.jpg');
			expect(updateImageData[0].imageStep).toBe(3);

			expect(boardResize).not.toHaveBeenCalled();
			expect(deleteBoardImageFromNames).toHaveBeenCalledWith(['testImage1_1.jpg', 'testImage1_2.jpg']);
		});

		it('정상 수정. 파일 삭제가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testUpdateTitle')
								.field('content', 'testUpdateContent')
								.attach('files', Buffer.from('fake'), 'testUpdateImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content).toBe(1);

			const updateImageBoard = await ImageBoard.findOne({ where: { id: 1 } });
			expect(updateImageBoard.title).toBe('testUpdateTitle');
			expect(updateImageBoard.content).toBe('testUpdateContent');
			expect(updateImageBoard.userId).toBe(SAVE_MEMBER[0].id);

			const updateImageData = await ImageData.findAll({ where: { imageId: 1 }, order: [['imageStep', 'ASC']] });
			expect(updateImageData.length).toBe(4);
			expect(updateImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(updateImageData[0].originName).toBe('testImage_old_1_1.jpg');
			expect(updateImageData[0].imageStep).toBe(1);
			expect(updateImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(updateImageData[1].originName).toBe('testImage_old_1_2.jpg');
			expect(updateImageData[1].imageStep).toBe(2);
			expect(updateImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(updateImageData[2].originName).toBe('testImage_old_1_3.jpg');
			expect(updateImageData[2].imageStep).toBe(3);
			expect(updateImageData[3].imageName).toBeDefined();
			expect(updateImageData[3].originName).toBe('testUpdateImage1.jpg');
			expect(updateImageData[3].imageStep).toBe(4);

			expect(boardResize).toHaveBeenCalled();
			expect(deleteBoardImageFromNames).not.toHaveBeenCalled();
		});

		it('정상 수정. 파일 추가와 삭제가 모두 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testUpdateTitle')
								.field('content', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.OK);
			expect(res.body.content).toBe(1);

			const updateImageBoard = await ImageBoard.findOne({ where: { id: 1 } });
			expect(updateImageBoard.title).toBe('testUpdateTitle');
			expect(updateImageBoard.content).toBe('testUpdateContent');
			expect(updateImageBoard.userId).toBe(SAVE_MEMBER[0].id);

			const updateImageData = await ImageData.findAll({ where: { imageId: 1 }, order: [['imageStep', 'ASC']] });
			expect(updateImageData.length).toBe(3);
			expect(updateImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(updateImageData[0].originName).toBe('testImage_old_1_1.jpg');
			expect(updateImageData[0].imageStep).toBe(1);
			expect(updateImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(updateImageData[1].originName).toBe('testImage_old_1_2.jpg');
			expect(updateImageData[1].imageStep).toBe(2);
			expect(updateImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(updateImageData[2].originName).toBe('testImage_old_1_3.jpg');
			expect(updateImageData[2].imageStep).toBe(3);

			expect(boardResize).not.toHaveBeenCalled();
			expect(deleteBoardImageFromNames).not.toHaveBeenCalled();
		});

		it('제목이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', '')
								.field('content', 'testUpdateContent')
								.attach('files', Buffer.from('fake'), 'testUpdateImage1.jpg');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);

			expect(boardResize).not.toHaveBeenCalled();
			expect(deleteBoardImageFromFiles).toHaveBeenCalled();
		});

		it('제목이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testUpdateTitle'.repeat(100))
								.field('content', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);

			expect(boardResize).not.toHaveBeenCalled();
			expect(deleteBoardImageFromNames).not.toHaveBeenCalled();
		});

		it('내용이 비어있는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testUpdateTitle')
								.field('content', '');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('내용이 너무 긴 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testUpdateTitle')
								.field('content', 'testUpdateContent'.repeat(1000));

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.patch('/api/image-board/1')
								.field('title', 'testUpdateTitle')
								.field('content', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(WRONG_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testUpdateTitle')
								.field('content', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});
		
		it('데이터가 없는 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.patch('/api/image-board/99999')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								])
								.field('title', 'testUpdateTitle')
								.field('content', 'testUpdateContent');

			expect(res.status).toBe(ResponseStatusCode.BAD_REQUEST);
			expect(res.body.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
		});
	});

	describe('DELETE /image-board/:id', () => {
		it('정상 삭제', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(DEFAULT_USER_ID);
			const res = await request(app)
								.delete('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.NO_CONTENT);
			expect(res.body).toEqual({});

			const deleteImageBoard = await ImageBoard.findOne({ where: { id: 1 } });
			expect(deleteImageBoard).toBeNull();

			const deleteImageData = await ImageData.findAll({ where: { imageId: 1 } });
			expect(deleteImageData.length).toBe(0);

			expect(deleteBoardImageFromNames).toHaveBeenCalledWith(
				['testImage1_1.jpg', 'testImage1_2.jpg', 'testImage1_3.jpg']
			)
		});

		it('비회원 접근', async () => {
			const res = await request(app)
								.delete('/api/image-board/1');

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
		});

		it('작성자가 아닌 경우', async () => {
			const { accessToken, refreshToken, ino } = await createTestToken(WRONG_USER_ID);
			const res = await request(app)
								.delete('/api/image-board/1')
								.set('Cookie', [
									`Authorization=${accessToken}`,
									`Authorization_Refresh=${refreshToken}`,
									`Authorization_ino=${ino}`,
								]);

			expect(res.status).toBe(ResponseStatusCode.FORBIDDEN);
			expect(res.body.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);

			const deleteImageBoard = await ImageBoard.findOne({ where: { id: 1 } });
			expect(deleteImageBoard).not.toBeNull();

			const deleteImageData = await ImageData.findAll({ where: { imageId: 1 }, order: [['imageStep', 'ASC']] });
			expect(deleteImageData.length).toBe(3);

			expect(deleteImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(deleteImageData[0].originName).toBe('testImage_old_1_1.jpg');
			expect(deleteImageData[0].imageStep).toBe(1);
			expect(deleteImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(deleteImageData[1].originName).toBe('testImage_old_1_2.jpg');
			expect(deleteImageData[1].imageStep).toBe(2);
			expect(deleteImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(deleteImageData[2].originName).toBe('testImage_old_1_3.jpg');
			expect(deleteImageData[2].imageStep).toBe(3);

			expect(deleteBoardImageFromNames).not.toHaveBeenCalled();
		});
	});
})