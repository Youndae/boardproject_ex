import { ImageBoardRepository } from '#repositories/imageBoardRepository.js';
import { 
	sequelize, 
	ImageBoard, 
	ImageData,
	Member,
	Auth
} from '#models/index.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import CustomError from '#errors/customError.js';

const BOARD_FIXTURE_LENGTH = 20;
const BOARD_AMOUNT = 15;
const DEFAULT_USER_ID = 'tester';

describe('imageBoardRepository test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		await Member.create({
			userId: DEFAULT_USER_ID,
			userPw: 'tester1234',
			userName: 'testerName',
			nickName: 'testerNickName',
			email: 'tester@tester.com',
			profileThumbnail: 'testerProfileThumbnail.jpg',
			provider: 'local',
		});

		await Auth.create({
			userId: DEFAULT_USER_ID,
			auth: 'ROLE_MEMBER',
		});
	});

	afterAll(async () => {
		await sequelize.close();
	});

	beforeEach(async () => {
		for(let i = 1; i <= BOARD_FIXTURE_LENGTH; i++) {
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
		await ImageBoard.destroy({ where: {} });
		await ImageData.destroy({ where: {} });
	});

	describe('getImageBoardListPageable', () => {
		it('정상 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardListPageable({pageNum: 1});

			expect(result.content.length).toBe(BOARD_AMOUNT);
			expect(result.totalElements).toBe(BOARD_FIXTURE_LENGTH);

			expect(result.content[0].imageNo).toBe(BOARD_FIXTURE_LENGTH);
			expect(result.content[1].imageNo).toBe(BOARD_FIXTURE_LENGTH - 1);
			expect(result.content[2].imageNo).toBe(BOARD_FIXTURE_LENGTH - 2);
			expect(result.content[3].imageNo).toBe(BOARD_FIXTURE_LENGTH - 3);

			result.content.forEach((item) => {
				expect(item.imageName).toBe(`testImage${item.imageNo}_1.jpg`);
			});
		});

		it('데이터가 없는 경우', async () => {
			await ImageBoard.destroy({ where: {} });
			const result = await ImageBoardRepository.getImageBoardListPageable({pageNum: 1});

			expect(result.content.length).toBe(0);
			expect(result.totalElements).toBe(0);
		});

		it('제목 기준 검색 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardListPageable({keyword: 'testTitle11', searchType: 't', pageNum: 1});

			expect(result.content.length).toBe(1);
			expect(result.totalElements).toBe(1);
			
			expect(result.content[0].imageNo).toBe(11);
		});

		it('내용 기준 검색 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardListPageable({keyword: 'testContent11', searchType: 'c', pageNum: 1});

			expect(result.content.length).toBe(1);
			expect(result.totalElements).toBe(1);
			
		});

		it('제목 및 내용 기준 검색 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardListPageable({keyword: 'testTitle11', searchType: 'tc', pageNum: 1});

			expect(result.content.length).toBe(1);
			expect(result.totalElements).toBe(1);
		});

		it('유저 기준 검색 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardListPageable({keyword: DEFAULT_USER_ID, searchType: 'u', pageNum: 1});

			expect(result.content.length).toBe(BOARD_AMOUNT);
			expect(result.totalElements).toBe(BOARD_FIXTURE_LENGTH);
		});
	});

	describe('getImageBoardDetail', () => {
		it('정상 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardDetail(1);

			expect(result.imageNo).toBe(1);
			expect(result.imageTitle).toBe('testTitle1');
			expect(result.imageContent).toBe('testContent1');
			expect(result.userId).toBe(DEFAULT_USER_ID);
			expect(result.imageDate).toBeDefined();
			expect(result.imageDatas.length).toBe(3);
			expect(result.imageDatas[0].imageName).toBe('testImage1_1.jpg');
			expect(result.imageDatas[0].oldName).toBe('testImage_old_1_1.jpg');
			expect(result.imageDatas[0].imageStep).toBe(1);
			expect(result.imageDatas[1].imageName).toBe('testImage1_2.jpg');
			expect(result.imageDatas[1].oldName).toBe('testImage_old_1_2.jpg');
			expect(result.imageDatas[1].imageStep).toBe(2);
			expect(result.imageDatas[2].imageName).toBe('testImage1_3.jpg');
			expect(result.imageDatas[2].oldName).toBe('testImage_old_1_3.jpg');
			expect(result.imageDatas[2].imageStep).toBe(3);
		});

		it('데이터가 없는 경우', async () => {
			try {
				await ImageBoardRepository.getImageBoardDetail(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});
	});

	describe('postImageBoard', () => {
		it('정상 저장', async () => {
			const mockFile = [
				{
					filename: 'testPostImage1.jpg',
					originalname: 'testPostImage_old_1.jpg',
				},
				{
					filename: 'testPostImage2.jpg',
					originalname: 'testPostImage_old_2.jpg',
				},
				{
					filename: 'testPostImage3.jpg',
					originalname: 'testPostImage_old_3.jpg',
				}
			]
			const result = await ImageBoardRepository.postImageBoard(
						DEFAULT_USER_ID, 
						'testTitle', 
						'testContent', 
						mockFile
				);

			expect(result).toBeDefined();

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: result } });
			expect(saveImageBoard.imageTitle).toBe('testTitle');
			expect(saveImageBoard.imageContent).toBe('testContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageNo: result } });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName).toBe('testPostImage1.jpg');
			expect(saveImageData[0].oldName).toBe('testPostImage_old_1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName).toBe('testPostImage2.jpg');
			expect(saveImageData[1].oldName).toBe('testPostImage_old_2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName).toBe('testPostImage3.jpg');
			expect(saveImageData[2].oldName).toBe('testPostImage_old_3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);
		});
	});

	describe('getImageBoardPatchDetail', () => {
		it('정상 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardPatchDetail(1);

			expect(result.imageNo).toBe(1);
			expect(result.imageTitle).toBe('testTitle1');
			expect(result.imageContent).toBe('testContent1');
			expect(result.imageDate).toBeDefined();
			expect(result.userId).toBeUndefined();
			expect(result.imageDatas.length).toBe(3);
			expect(result.imageDatas[0].imageName).toBe('testImage1_1.jpg');
			expect(result.imageDatas[1].imageName).toBe('testImage1_2.jpg');
			expect(result.imageDatas[2].imageName).toBe('testImage1_3.jpg');
		});

		it('데이터가 없는 경우', async () => {
			try {
				await ImageBoardRepository.getImageBoardPatchDetail(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});
	});

	describe('patchImageBoard', () => {
		it('정상 수정', async () => {
			const mockFile = [
				{
					filename: 'testPatchImage1_10.jpg',
					originalname: 'testPatchImage_old_1_10.jpg',
				},
				{
					filename: 'testPatchImage1_20.jpg',
					originalname: 'testPatchImage_old_1_20.jpg',
				},
			]
			const deleteFiles = ['testImage1_1.jpg', 'testImage1_2.jpg'];
			const result = await ImageBoardRepository.patchImageBoard(
				1, 
				'testUpdateTitle', 
				'testUpdateContent',
				mockFile,
				deleteFiles
			);

			expect(result).toBe(1);

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: result } });
			expect(saveImageBoard.imageTitle).toBe('testUpdateTitle');
			expect(saveImageBoard.imageContent).toBe('testUpdateContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);
			
			const saveImageData = await ImageData.findAll({ where: { imageNo: result } });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(saveImageData[0].oldName).toBe('testImage_old_1_3.jpg');
			expect(saveImageData[0].imageStep).toBe(3);
			expect(saveImageData[1].imageName).toBe('testPatchImage1_10.jpg');
			expect(saveImageData[1].oldName).toBe('testPatchImage_old_1_10.jpg');
			expect(saveImageData[1].imageStep).toBe(4);
			expect(saveImageData[2].imageName).toBe('testPatchImage1_20.jpg');
			expect(saveImageData[2].oldName).toBe('testPatchImage_old_1_20.jpg');
			expect(saveImageData[2].imageStep).toBe(5);
		});

		it('파일 추가가 없는 경우', async () => {
			const deleteFiles = ['testImage1_1.jpg', 'testImage1_2.jpg'];
			const result = await ImageBoardRepository.patchImageBoard(
				1, 
				'testUpdateTitle', 
				'testUpdateContent',
				undefined,
				deleteFiles
			);

			expect(result).toBe(1);

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: result } });
			expect(saveImageBoard.imageTitle).toBe('testUpdateTitle');
			expect(saveImageBoard.imageContent).toBe('testUpdateContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageNo: result } });
			expect(saveImageData.length).toBe(1);
			expect(saveImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(saveImageData[0].oldName).toBe('testImage_old_1_3.jpg');
			expect(saveImageData[0].imageStep).toBe(3);
		})

		it('파일 삭제가 없는 경우', async () => {
			const mockFile = [
				{
					filename: 'testPatchImage1_10.jpg',
					originalname: 'testPatchImage_old_1_10.jpg',
				},
			]
			const result = await ImageBoardRepository.patchImageBoard(
				1, 
				'testUpdateTitle', 
				'testUpdateContent',
				mockFile,
				undefined
			);

			expect(result).toBe(1);

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: result } });
			expect(saveImageBoard.imageTitle).toBe('testUpdateTitle');
			expect(saveImageBoard.imageContent).toBe('testUpdateContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageNo: result } });
			expect(saveImageData.length).toBe(4);
			expect(saveImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(saveImageData[0].oldName).toBe('testImage_old_1_1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(saveImageData[1].oldName).toBe('testImage_old_1_2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(saveImageData[2].oldName).toBe('testImage_old_1_3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);
			expect(saveImageData[3].imageName).toBe('testPatchImage1_10.jpg');
			expect(saveImageData[3].oldName).toBe('testPatchImage_old_1_10.jpg');
			expect(saveImageData[3].imageStep).toBe(4);
		});

		it('파일 추가와 삭제가 모두 없는 경우', async () => {
			const result = await ImageBoardRepository.patchImageBoard(
				1, 
				'testUpdateTitle', 
				'testUpdateContent',
				undefined,
				undefined
			);

			expect(result).toBe(1);

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: result } });
			expect(saveImageBoard.imageTitle).toBe('testUpdateTitle');
			expect(saveImageBoard.imageContent).toBe('testUpdateContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageNo: result } });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(saveImageData[0].oldName).toBe('testImage_old_1_1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(saveImageData[1].oldName).toBe('testImage_old_1_2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(saveImageData[2].oldName).toBe('testImage_old_1_3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);
		});
	});

	describe('deleteImageBoard', () => {
		it('정상 삭제', async () => {
			const result = await ImageBoardRepository.deleteImageBoard(1);

			expect(result).toBeUndefined();

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: 1 } });
			expect(saveImageBoard).toBeNull();
		});
	})
})