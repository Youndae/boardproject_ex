import { jest } from '@jest/globals';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import { sequelize, ImageBoard, ImageData, Member, Auth } from '#models/index.js';
import { ImageBoardRepository } from '#repositories/imageBoardRepository.js';
import { ImageConstants } from '#constants/imageConstants.js';

await jest.unstable_mockModule('#utils/fileUtils.js', () => ({
	deleteImageFile: jest.fn(),
	deleteBoardImageFromFiles: jest.fn(),
	deleteBoardImageFromNames: jest.fn(),
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
	deleteBoardImageFromFiles,
	deleteBoardImageFromNames
} = await import('#utils/fileUtils.js');

const DEFAULT_MEMBER = {
	id: 1,
	userId: 'tester',
	password: 'tester1234',
	username: 'testerName',
	nickname: 'testerNickName',
	email: 'tester@tester.com',
	profile: 'testerProfileThumbnail.jpg',
}
const BOARD_FIXTURE_LENGTH = 20;
const BOARD_AMOUNT = 15;

describe('imageService integration test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		await Member.create(DEFAULT_MEMBER);

		await Auth.create({
			userId: DEFAULT_MEMBER.id,
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
				id: i,
				userId: DEFAULT_MEMBER.id,
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
	});

	describe('getImageBoardListService', () => {
		it('정상 조회', async () => {
			const result = await getImageBoardListService({});

			expect(result).toBeDefined();
			expect(result.items.length).toBe(BOARD_AMOUNT);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(Math.ceil(BOARD_FIXTURE_LENGTH / BOARD_AMOUNT));
			expect(result.currentPage).toBe(1);

			result.items.forEach((item) => {
				expect(item.imageName).toBeDefined();
			})
		});

		it('데이터가 없는 경우', async () => {
			await ImageBoard.destroy({ where: {} });
			const result = await getImageBoardListService({});
			expect(result.items.length).toBe(0);
			expect(result.isEmpty).toBe(true);
			expect(result.totalPages).toBe(0);
			expect(result.currentPage).toBe(1);
		});

		it('제목 기준 검색 조회', async () => {
			const result = await getImageBoardListService({ keyword: 'testTitle11', searchType: 't' });
			expect(result.items.length).toBe(1);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(1);
			expect(result.currentPage).toBe(1);
		});

		it('내용 기준 검색 조회', async () => {
			const result = await getImageBoardListService({ keyword: 'testContent11', searchType: 'c' });
			expect(result.items.length).toBe(1);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(1);
			expect(result.currentPage).toBe(1);
		});

		it('제목 및 내용 기준 검색 조회', async () => {
			const result = await getImageBoardListService({ keyword: 'testTitle11', searchType: 'tc' });
			expect(result.items.length).toBe(1);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(1);
			expect(result.currentPage).toBe(1);
		});

		it('유저 기준 검색 조회', async () => {
			const result = await getImageBoardListService({ keyword: DEFAULT_MEMBER.nickname, searchType: 'u' });
			expect(result.items.length).toBe(BOARD_AMOUNT);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(Math.ceil(BOARD_FIXTURE_LENGTH / BOARD_AMOUNT));
			expect(result.currentPage).toBe(1);

			result.items.forEach((item) => {
				expect(item.imageName).toBeDefined();
			});
		});
	});

	describe('getImageBoardDetailService', () => {
		it('정상 조회', async () => {
			const result = await getImageBoardDetailService(1);

			expect(result).toBeDefined();
			expect(result.id).toBeUndefined();
			expect(result.title).toBe('testTitle1');
			expect(result.content).toBe('testContent1');
			expect(result.writer).toBe(DEFAULT_MEMBER.nickname);
			expect(result.writerId).toBe(DEFAULT_MEMBER.userId);
			expect(result.createdAt).toBeDefined();
			expect(result.imageDataList.length).toBe(3);
			expect(result.imageDataList[0]).toBe('testImage1_1.jpg');
			expect(result.imageDataList[1]).toBe('testImage1_2.jpg');
			expect(result.imageDataList[2]).toBe('testImage1_3.jpg');
		});

		it('데이터가 없는 경우', async () => {
			try {
				await getImageBoardDetailService(9999);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});
	});

	describe('postImageBoardService', () => {
		it('정상 처리', async () => {
			const result = await postImageBoardService(
				DEFAULT_MEMBER.id,
				{ title: 'testPostTitle', content: 'testPostContent' },
				[
					{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' },
					{ filename: 'testImage2.jpg', originalname: 'testImage_old_2.jpg' },
					{ filename: 'testImage3.jpg', originalname: 'testImage_old_3.jpg' },
				]
			);

			expect(result).toBeDefined();

			const saveImageBoard = await ImageBoard.findOne({ where: { id: result } });
			expect(saveImageBoard.title).toBe('testPostTitle');
			expect(saveImageBoard.content).toBe('testPostContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_MEMBER.id);

			const saveImageData = await ImageData.findAll({ where: { imageId: result }, order: [['imageStep', 'ASC']] });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName).toBe('testImage1.jpg');
			expect(saveImageData[0].originName).toBe('testImage_old_1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName).toBe('testImage2.jpg');
			expect(saveImageData[1].originName).toBe('testImage_old_2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName).toBe('testImage3.jpg');
			expect(saveImageData[2].originName).toBe('testImage_old_3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);

			expect(deleteBoardImageFromFiles).not.toHaveBeenCalled();
		});

		it('오류 발생', async () => {
			await ImageData.destroy({ where: {} });
			await ImageBoard.destroy({ where: {} });
			jest.spyOn(ImageBoardRepository, 'postImageBoard').mockRejectedValue(new Error('오류 발생'));
			const postFiles = [
				{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' },
				{ filename: 'testImage2.jpg', originalname: 'testImage_old_2.jpg' },
				{ filename: 'testImage3.jpg', originalname: 'testImage_old_3.jpg' },
			]
			try {
				await postImageBoardService(
					DEFAULT_MEMBER.id,
					{
						title: 'testPostTitle',
						content: 'testPostContent'
					},
					postFiles,
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}

			const saveImageBoard = await ImageBoard.findAll({ where: {} });
			expect(saveImageBoard.length).toBe(0);

			const saveImageData = await ImageData.findAll({ where: {} });
			expect(saveImageData.length).toBe(0);
			expect(deleteBoardImageFromFiles).toHaveBeenCalledWith(postFiles);
		});
	});

	describe('getImageBoardPatchDetailService', () => {
		it('정상 조회', async () => {
			const result = await getImageBoardPatchDetailService(1, DEFAULT_MEMBER.id);

			expect(result).toBeDefined();
			expect(result.id).toBeUndefined();
			expect(result.title).toBe('testTitle1');
			expect(result.content).toBe('testContent1');
			expect(result.createdAt).toBeUndefined();
			expect(result.imageList).toBeDefined();

			result.imageList.forEach((item, idx) => {
				expect(item.imageName).toBeDefined();
				expect(item.originName).toBeDefined();
				expect(item.imageStep).toBe(idx + 1);
			})
		});

		it('데이터가 없는 경우', async () => {
			try {
				await getImageBoardPatchDetailService(9999, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
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
		const addFiles = [
				{ filename: 'testPatchImage1.jpg', originalname: 'testPatchImage_old_1.jpg' },
				{ filename: 'testPatchImage2.jpg', originalname: 'testPatchImage_old_2.jpg' },
				{ filename: 'testPatchImage3.jpg', originalname: 'testPatchImage_old_3.jpg' },
			];
		const deleteFiles = ['testImage1_1.jpg', 'testImage1_2.jpg'];
		it('정상 처리', async () => {
			const result = await patchImageBoardService(
				DEFAULT_MEMBER.id,
				1, 
				{ title: 'testPatchTitle', content: 'testPatchContent' },
				addFiles,
				deleteFiles,
				);

			expect(result).toBe(1);

			const patchImageBoard = await ImageBoard.findOne({ where: { id: result } });
			expect(patchImageBoard.title).toBe('testPatchTitle');
			expect(patchImageBoard.content).toBe('testPatchContent');
			expect(patchImageBoard.userId).toBe(DEFAULT_MEMBER.id);

			const patchImageData = await ImageData.findAll({ where: { imageId: result }, order: [['imageStep', 'ASC']] });
			expect(patchImageData.length).toBe(4);
			expect(patchImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(patchImageData[0].originName).toBe('testImage_old_1_3.jpg');
			expect(patchImageData[0].imageStep).toBe(3);
			expect(patchImageData[1].imageName).toBe('testPatchImage1.jpg');
			expect(patchImageData[1].originName).toBe('testPatchImage_old_1.jpg');
			expect(patchImageData[1].imageStep).toBe(4);
			expect(patchImageData[2].imageName).toBe('testPatchImage2.jpg');
			expect(patchImageData[2].originName).toBe('testPatchImage_old_2.jpg');
			expect(patchImageData[2].imageStep).toBe(5);
			expect(patchImageData[3].imageName).toBe('testPatchImage3.jpg');
			expect(patchImageData[3].originName).toBe('testPatchImage_old_3.jpg');
			expect(patchImageData[3].imageStep).toBe(6);

			expect(deleteBoardImageFromNames).toHaveBeenCalledWith(deleteFiles);
			expect(deleteBoardImageFromFiles).not.toHaveBeenCalled();
		});

		it('작성자가 아닌 경우', async () => {
			try {
				await patchImageBoardService(
					'wrong_id',
					1, 
					{ title: 'testPatchTitle', content: 'testPatchContent' },
					addFiles,
					deleteFiles
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				
				const saveImageBoard = await ImageBoard.findOne({ where: { id: 1} });
				expect(saveImageBoard.title).toBe('testTitle1');
				expect(saveImageBoard.content).toBe('testContent1');

				expect(deleteBoardImageFromFiles).toHaveBeenCalledWith(addFiles);
				expect(deleteBoardImageFromNames).not.toHaveBeenCalledWith(deleteFiles);
			}
		});

		it('오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'patchImageBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await patchImageBoardService(
					DEFAULT_MEMBER.id,
					1,
					{
						title: 'testPatchTitle',
						content: 'testPatchContent'
					},
					addFiles,
					deleteFiles
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}

			const saveImageBoard = await ImageBoard.findOne({ where: { id: 1} });
			expect(saveImageBoard.title).toBe('testTitle1');
			expect(saveImageBoard.content).toBe('testContent1');

			expect(deleteBoardImageFromNames).not.toHaveBeenCalledWith(deleteFiles);
			expect(deleteBoardImageFromFiles).toHaveBeenCalledWith(addFiles);
		});
	});

	describe('deleteImageBoardService', () => {
		it('정상 처리', async () => {
			await deleteImageBoardService(1, DEFAULT_MEMBER.id);

			const saveImageBoard = await ImageBoard.findOne({ where: { id: 1} });
			expect(saveImageBoard).toBeNull();

			const saveImageData = await ImageData.findAll({ where: { imageId: 1} });
			expect(saveImageData.length).toBe(0);

			expect(deleteBoardImageFromNames).toHaveBeenCalledWith(
				[
					'testImage1_1.jpg',
					'testImage1_2.jpg',
					'testImage1_3.jpg'
				]
			);
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

				expect(deleteBoardImageFromNames).not.toHaveBeenCalled();

				const imageBoard = await ImageBoard.findOne({ where: { id: 1 } });
				expect(imageBoard).not.toBeNull();

				const imageDataList = await ImageData.findAll({ where: { imageId: 1 } });
				expect(imageDataList).not.toBeNull();
				expect(imageDataList.length).not.toBe(0);
			}
		});

		it('오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'deleteImageBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await deleteImageBoardService(1, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(deleteBoardImageFromNames).not.toHaveBeenCalled();

				const imageBoard = await ImageBoard.findOne({ where: { id: 1 } });
				expect(imageBoard).not.toBeNull();

				const imageDataList = await ImageData.findAll({ where: { imageId: 1 } });
				expect(imageDataList).not.toBeNull();
				expect(imageDataList.length).not.toBe(0);
			}
		});
	});

});