import { jest } from '@jest/globals';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import { sequelize, ImageBoard, ImageData, Member, Auth } from '#models/index.js';
import { ImageBoardRepository } from '#repositories/imageBoardRepository.js';
import { ImageConstants } from '#constants/imageConstants.js';

await jest.unstable_mockModule('#utils/fileUtils.js', () => ({
	deleteImageFile: jest.fn(),
}));

const {
	getImageBoardListService,
	getImageBoardDetailService,
	postImageBoardService,
	getImageBoardPatchDetailService,
	patchImageBoardService,
	deleteImageBoardService,
} = await import('#services/imageBoard/imageBoardService.js');

const {
	deleteImageFile,
} = await import('#utils/fileUtils.js');

const DEFAULT_USER_ID = 'tester';
const BOARD_FIXTURE_LENGTH = 20;
const BOARD_AMOUNT = 15;

describe('imageService integration test', () => {
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
		});

		await Auth.create({
			userId: DEFAULT_USER_ID,
			auth: 'ROLE_MEMBER',
		});
	});

	afterAll(async () => {
		await Auth.destroy({ where: {} });
		await Member.destroy({ where: {} });
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
		await ImageData.destroy({ where: {} });
		await ImageBoard.destroy({ where: {} });
	});

	describe('getImageBoardListService', () => {
		it('정상 조회', async () => {
			const result = await getImageBoardListService({});

			expect(result).toBeDefined();
			expect(result.content.length).toBe(BOARD_AMOUNT);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(BOARD_FIXTURE_LENGTH);

			expect(result.content[0].imageNo).toBe(BOARD_FIXTURE_LENGTH);
			expect(result.content[1].imageNo).toBe(BOARD_FIXTURE_LENGTH - 1);
			expect(result.content[2].imageNo).toBe(BOARD_FIXTURE_LENGTH - 2);

			result.content.forEach((item) => {
				expect(item.imageName).toBeDefined();
			})
		});

		it('데이터가 없는 경우', async () => {
			await ImageBoard.destroy({ where: {} });
			const result = await getImageBoardListService({});
			expect(result.content.length).toBe(0);
			expect(result.empty).toBe(true);
			expect(result.totalElements).toBe(0);
		});

		it('제목 기준 검색 조회', async () => {
			const result = await getImageBoardListService({ keyword: 'testTitle11', searchType: 't' });
			expect(result.content.length).toBe(1);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(1);

			expect(result.content[0].imageNo).toBe(11);
			expect(result.content[0].imageName).toBeDefined();
		});

		it('내용 기준 검색 조회', async () => {
			const result = await getImageBoardListService({ keyword: 'testContent11', searchType: 'c' });
			expect(result.content.length).toBe(1);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(1);

			expect(result.content[0].imageNo).toBe(11);
			expect(result.content[0].imageName).toBeDefined();
		});

		it('제목 및 내용 기준 검색 조회', async () => {
			const result = await getImageBoardListService({ keyword: 'testTitle11', searchType: 'tc' });
			expect(result.content.length).toBe(1);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(1);

			expect(result.content[0].imageNo).toBe(11);
			expect(result.content[0].imageName).toBeDefined();
		});

		it('유저 기준 검색 조회', async () => {
			const result = await getImageBoardListService({ keyword: DEFAULT_USER_ID, searchType: 'u' });
			expect(result.content.length).toBe(BOARD_AMOUNT);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(BOARD_FIXTURE_LENGTH);

			expect(result.content[0].imageNo).toBe(BOARD_FIXTURE_LENGTH);
			expect(result.content[1].imageNo).toBe(BOARD_FIXTURE_LENGTH - 1);
			expect(result.content[2].imageNo).toBe(BOARD_FIXTURE_LENGTH - 2);

			result.content.forEach((item) => {
				expect(item.imageName).toBeDefined();
			});
		});
	});

	describe('getImageBoardDetailService', () => {
		it('정상 조회', async () => {
			const result = await getImageBoardDetailService(1);

			expect(result).toBeDefined();
			expect(result.imageNo).toBe(1);
			expect(result.imageTitle).toBe('testTitle1');
			expect(result.imageContent).toBe('testContent1');
			expect(result.userId).toBe(DEFAULT_USER_ID);
			expect(result.imageDate).toBe(new Date().toISOString().split('T')[0]);
			expect(result.imageData.length).toBe(3);
			expect(result.imageData[0].imageName).toBe('testImage1_1.jpg');
			expect(result.imageData[0].oldName).toBe('testImage_old_1_1.jpg');
			expect(result.imageData[0].imageStep).toBe(1);
			expect(result.imageData[1].imageName).toBe('testImage1_2.jpg');
			expect(result.imageData[1].oldName).toBe('testImage_old_1_2.jpg');
			expect(result.imageData[1].imageStep).toBe(2);
			expect(result.imageData[2].imageName).toBe('testImage1_3.jpg');
			expect(result.imageData[2].oldName).toBe('testImage_old_1_3.jpg');
			expect(result.imageData[2].imageStep).toBe(3);
		});

		it('데이터가 없는 경우', async () => {
			try {
				await getImageBoardDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});
	});

	describe('postImageBoardService', () => {
		it('정상 처리', async () => {
			const result = await postImageBoardService(
				DEFAULT_USER_ID, 
				{ imageTitle: 'testPostTitle', imageContent: 'testPostContent' }, 
				[
					{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' },
					{ filename: 'testImage2.jpg', originalname: 'testImage_old_2.jpg' },
					{ filename: 'testImage3.jpg', originalname: 'testImage_old_3.jpg' },
				]
			);

			expect(result).toBeDefined();

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: result } });
			expect(saveImageBoard.imageTitle).toBe('testPostTitle');
			expect(saveImageBoard.imageContent).toBe('testPostContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageNo: result }, order: [['imageStep', 'ASC']] });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName).toBe('board_testImage1.jpg');
			expect(saveImageData[0].oldName).toBe('testImage_old_1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName).toBe('board_testImage2.jpg');
			expect(saveImageData[1].oldName).toBe('testImage_old_2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName).toBe('board_testImage3.jpg');
			expect(saveImageData[2].oldName).toBe('testImage_old_3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);
			expect(deleteImageFile).not.toHaveBeenCalled();
		});

		it('오류 발생', async () => {
			await ImageData.destroy({ where: {} });
			await ImageBoard.destroy({ where: {} });
			jest.spyOn(ImageBoardRepository, 'postImageBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await postImageBoardService(DEFAULT_USER_ID, { imageTitle: 'testPostTitle', imageContent: 'testPostContent' }, [
					{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' },
					{ filename: 'testImage2.jpg', originalname: 'testImage_old_2.jpg' },
					{ filename: 'testImage3.jpg', originalname: 'testImage_old_3.jpg' },
				]);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}

			const saveImageBoard = await ImageBoard.findAll({ where: {} });
			expect(saveImageBoard.length).toBe(0);

			const saveImageData = await ImageData.findAll({ where: {} });
			expect(saveImageData.length).toBe(0);
			expect(deleteImageFile).toHaveBeenCalled();
		});
	});

	describe('getImageBoardPatchDetailService', () => {
		it('정상 조회', async () => {
			const result = await getImageBoardPatchDetailService(1, DEFAULT_USER_ID);

			expect(result).toBeDefined();
			expect(result.imageNo).toBe(1);
			expect(result.imageTitle).toBe('testTitle1');
			expect(result.imageContent).toBe('testContent1');
			expect(result.imageDate).toBeUndefined();
			expect(result.userId).toBeUndefined();
		});

		it('데이터가 없는 경우', async () => {
			try {
				await getImageBoardPatchDetailService(0, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});

		it('작성자가 아닌 경우', async () => {
			try {
				await getImageBoardPatchDetailService(1, 'wrongUser');
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('patchImageBoardService', () => {
		it('정상 처리', async () => {
			const result = await patchImageBoardService(
				DEFAULT_USER_ID, 
				1, 
				{ imageTitle: 'testPatchTitle', imageContent: 'testPatchContent' }, 
				[
					{ filename: 'testPatchImage1.jpg', originalname: 'testPatchImage_old_1.jpg' },
					{ filename: 'testPatchImage2.jpg', originalname: 'testPatchImage_old_2.jpg' },
					{ filename: 'testPatchImage3.jpg', originalname: 'testPatchImage_old_3.jpg' },
				],
				['testImage1_1.jpg', 'testImage1_2.jpg'],
				);

			expect(result).toBe(1);

			const patchImageBoard = await ImageBoard.findOne({ where: { imageNo: result } });
			expect(patchImageBoard.imageTitle).toBe('testPatchTitle');
			expect(patchImageBoard.imageContent).toBe('testPatchContent');
			expect(patchImageBoard.userId).toBe(DEFAULT_USER_ID);

			const patchImageData = await ImageData.findAll({ where: { imageNo: result }, order: [['imageStep', 'ASC']] });
			expect(patchImageData.length).toBe(4);
			expect(patchImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(patchImageData[0].oldName).toBe('testImage_old_1_3.jpg');
			expect(patchImageData[0].imageStep).toBe(3);
			expect(patchImageData[1].imageName).toBe('board_testPatchImage1.jpg');
			expect(patchImageData[1].oldName).toBe('testPatchImage_old_1.jpg');
			expect(patchImageData[1].imageStep).toBe(4);
			expect(patchImageData[2].imageName).toBe('board_testPatchImage2.jpg');
			expect(patchImageData[2].oldName).toBe('testPatchImage_old_2.jpg');
			expect(patchImageData[2].imageStep).toBe(5);
			expect(patchImageData[3].imageName).toBe('board_testPatchImage3.jpg');
			expect(patchImageData[3].oldName).toBe('testPatchImage_old_3.jpg');
			expect(patchImageData[3].imageStep).toBe(6);
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_1.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_2.jpg', ImageConstants.BOARD_TYPE);
		});

		it('작성자가 아닌 경우', async () => {
			try {
				await patchImageBoardService(
					DEFAULT_USER_ID, 
					1, 
					{ imageTitle: 'testPatchTitle', imageContent: 'testPatchContent' }, 
					[
						{ filename: 'testPatchImage1.jpg', originalname: 'testPatchImage_old_1.jpg' },
						{ filename: 'testPatchImage2.jpg', originalname: 'testPatchImage_old_2.jpg' },
						{ filename: 'testPatchImage3.jpg', originalname: 'testPatchImage_old_3.jpg' },
					], 
					['testImage1_1.jpg', 'testImage1_2.jpg']
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(ImageBoardRepository.patchImageBoard).not.toHaveBeenCalled();
				
				const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: 1} });
				expect(saveImageBoard.imageTitle).toBe('testTitle1');
				expect(saveImageBoard.imageContent).toBe('testContent1');
			
				expect(deleteImageFile).not.toHaveBeenCalledWith('testImage1_1.jpg', ImageConstants.BOARD_TYPE);
				expect(deleteImageFile).not.toHaveBeenCalledWith('testImage1_2.jpg', ImageConstants.BOARD_TYPE);
				expect(deleteImageFile).toHaveBeenCalledWith('testPatchImage1.jpg', ImageConstants.BOARD_TYPE);
				expect(deleteImageFile).toHaveBeenCalledWith('testPatchImage2.jpg', ImageConstants.BOARD_TYPE);
				expect(deleteImageFile).toHaveBeenCalledWith('testPatchImage3.jpg', ImageConstants.BOARD_TYPE);
			}
		});

		it('오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'patchImageBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await patchImageBoardService(DEFAULT_USER_ID, 1, { imageTitle: 'testPatchTitle', imageContent: 'testPatchContent' }, [
					{ filename: 'testPatchImage1.jpg', originalname: 'testPatchImage_old_1.jpg' },
					{ filename: 'testPatchImage2.jpg', originalname: 'testPatchImage_old_2.jpg' },
					{ filename: 'testPatchImage3.jpg', originalname: 'testPatchImage_old_3.jpg' },
				], ['testImage1_1.jpg', 'testImage1_2.jpg']);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: 1} });
			expect(saveImageBoard.imageTitle).toBe('testTitle1');
			expect(saveImageBoard.imageContent).toBe('testContent1');
		
			expect(deleteImageFile).not.toHaveBeenCalledWith('testImage1_1.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).not.toHaveBeenCalledWith('testImage1_2.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).toHaveBeenCalledWith('testPatchImage1.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).toHaveBeenCalledWith('testPatchImage2.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).toHaveBeenCalledWith('testPatchImage3.jpg', ImageConstants.BOARD_TYPE);
		});
	});

	describe('deleteImageBoardService', () => {
		it('정상 처리', async () => {
			await deleteImageBoardService(1, DEFAULT_USER_ID);

			const saveImageBoard = await ImageBoard.findOne({ where: { imageNo: 1} });
			expect(saveImageBoard).toBeNull();

			const saveImageData = await ImageData.findAll({ where: { imageNo: 1} });
			expect(saveImageData.length).toBe(0);
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_1.jpg', ImageConstants.BOARD_TYPE);
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_2.jpg', ImageConstants.BOARD_TYPE);
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(ImageBoardRepository, 'deleteImageBoard');
			jest.spyOn(ImageBoardRepository, 'getImageBoardDeleteFiles');
			try {
				await deleteImageBoardService(1, 'wrongUser');
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(ImageBoardRepository.deleteImageBoard).not.toHaveBeenCalled();
				expect(ImageBoardRepository.getImageBoardDeleteFiles).not.toHaveBeenCalled();
				expect(deleteImageFile).not.toHaveBeenCalled();
			}
		});

		it('오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'deleteImageBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await deleteImageBoardService(1, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(deleteImageFile).not.toHaveBeenCalled();
			}
		});
	});

});