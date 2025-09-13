import { ImageBoardRepository } from '#repositories/imageBoardRepository.js';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import { jest } from '@jest/globals';
import { ImageConstants } from '#constants/imageConstants.js';
import { sequelize } from '#models/index.js';

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

const SAVE_IMAGE_BOARD_LIST = [
	{
		imageNo: 1,
		imageTitle: 'testTitle1',
		imageContent: 'testContent1',
		userId: DEFAULT_USER_ID,
		imageDate: new Date(),
		imageName: 'testImage1_1.jpg',
	},
	{
		imageNo: 2,
		imageTitle: 'testTitle2',
		imageContent: 'testContent2',
		userId: DEFAULT_USER_ID,
		imageDate: new Date(),
		imageName: 'testImage2_1.jpg',
	},
	{
		imageNo: 3,
		imageTitle: 'testTitle3',
		imageContent: 'testContent3',
		userId: DEFAULT_USER_ID,
		imageDate: new Date(),
		imageName: 'testImage3_1.jpg',
	},
];

const SAVE_IMAGE_BOARD_DETAIL = {
	imageNo: 1,
	imageTitle: 'testTitle1',
	imageContent: 'testContent1',
	userId: DEFAULT_USER_ID,
	imageDate: new Date(),
	imageDatas: [
		{
			imageName: 'testImage1_1.jpg',
			oldName: 'testImage_old_1_1.jpg',
			imageStep: 1,
		},
		{
			imageName: 'testImage1_2.jpg',
			oldName: 'testImage_old_1_2.jpg',
			imageStep: 2,
		},
		{
			imageName: 'testImage1_3.jpg',
			oldName: 'testImage_old_1_3.jpg',
			imageStep: 3,
		}
	],
};

describe('imageService unit test', () => {
	describe('getImageBoardListService', () => {
		it('정상 조회', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardListPageable').mockResolvedValue({ content: SAVE_IMAGE_BOARD_LIST, totalElements: 3 });

			const result = await getImageBoardListService({ pageNum: 1 });

			expect(result.content.length).toBe(3);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(3);
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardListPageable').mockResolvedValue({ content: [], totalElements: 0 });

			const result = await getImageBoardListService({ pageNum: 1 });

			expect(result.content.length).toBe(0);
			expect(result.empty).toBe(true);
			expect(result.totalElements).toBe(0);
		});
	});

	describe('getImageBoardDetailService', () => {
		it('정상 조회', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardDetail').mockResolvedValue(SAVE_IMAGE_BOARD_DETAIL);

			const result = await getImageBoardDetailService(1);
			
			expect(result.imageNo).toBe(1);
			expect(result.imageTitle).toBe('testTitle1');
			expect(result.imageContent).toBe('testContent1');
			expect(result.userId).toBe('tester');
			expect(result.imageDate).toBe(new Date().toLocaleDateString('sv-SE'));
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
			jest.spyOn(ImageBoardRepository, 'getImageBoardDetail').mockRejectedValue(new CustomError(ResponseStatus.NOT_FOUND));
			try {
				await getImageBoardDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});

		it('조회시 오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardDetail').mockRejectedValue(new Error('오류 발생'));
			try {
				await getImageBoardDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});
	});

	describe('postImageBoardService', () => {
		it('정상 처리', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'postImageBoard').mockResolvedValue(1);

			const result = await postImageBoardService(
				'tester', 
				{ imageTitle: 'testTitle', imageContent: 'testContent' }, 
				[
					{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' },
					{ filename: 'testImage2.jpg', originalname: 'testImage_old_2.jpg' },
					{ filename: 'testImage3.jpg', originalname: 'testImage_old_3.jpg' }
				]
			);

			expect(result).toBe(1);
			expect(ImageBoardRepository.postImageBoard)
				.toHaveBeenCalledWith(
					'tester', 
					'testTitle', 
					'testContent', 
					[
						{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }, 
						{ filename: 'testImage2.jpg', originalname: 'testImage_old_2.jpg' }, 
						{ filename: 'testImage3.jpg', originalname: 'testImage_old_3.jpg' }
					], 
					{ transaction: mockTransaction }
				);
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
		});

		it('처리시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'postImageBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await postImageBoardService(
					'tester', 
					{ imageTitle: 'testTitle', imageContent: 'testContent' }, 
					[
						{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }
					]
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledWith('testImage1.jpg', ImageConstants.BOARD_TYPE);
			}
		});
	});

	describe('getImageBoardPatchDetailService', () => {
		it('정상 조회', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_USER_ID);
			jest.spyOn(ImageBoardRepository, 'getImageBoardPatchDetail')
					.mockResolvedValue(
						{
							imageNo: SAVE_IMAGE_BOARD_DETAIL.imageNo,
							imageTitle: SAVE_IMAGE_BOARD_DETAIL.imageTitle,
							imageContent: SAVE_IMAGE_BOARD_DETAIL.imageContent,
							imageDatas: [
								SAVE_IMAGE_BOARD_DETAIL.imageDatas[0].imageName,
								SAVE_IMAGE_BOARD_DETAIL.imageDatas[1].imageName,
								SAVE_IMAGE_BOARD_DETAIL.imageDatas[2].imageName,
							],
						}
					);

			const result = await getImageBoardPatchDetailService(1, DEFAULT_USER_ID);

			expect(result.imageNo).toBe(SAVE_IMAGE_BOARD_DETAIL.imageNo);
			expect(result.imageTitle).toBe(SAVE_IMAGE_BOARD_DETAIL.imageTitle);
			expect(result.imageContent).toBe(SAVE_IMAGE_BOARD_DETAIL.imageContent);
			expect(result.imageDatas.length).toBe(3);
			expect(result.userId).toBeUndefined();
		});

		it('데이터가 없는 경우', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_USER_ID);
			jest.spyOn(ImageBoardRepository, 'getImageBoardPatchDetail').mockRejectedValue(new CustomError(ResponseStatus.NOT_FOUND));
			try {
				await getImageBoardPatchDetailService(0, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});

		it('조회시 오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_USER_ID);
			jest.spyOn(ImageBoardRepository, 'getImageBoardPatchDetail').mockRejectedValue(new Error('오류 발생'));
			try {
				await getImageBoardPatchDetailService(0, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue('wrongUser');
			jest.spyOn(ImageBoardRepository, 'getImageBoardPatchDetail');
			try {
				await getImageBoardPatchDetailService(0, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(ImageBoardRepository.getImageBoardPatchDetail).not.toHaveBeenCalled();
			}
		});
	});

	describe('patchImageBoardService', () => {
		it('정상 수정. 모든 데이터가 존재하는 경우', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_USER_ID);
			jest.spyOn(ImageBoardRepository, 'patchImageBoard').mockResolvedValue(1);
			const result =await patchImageBoardService(
				DEFAULT_USER_ID, 
				1, 
				{ imageTitle: 'testTitle', imageContent: 'testContent' },
				[{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }],
				['testImage1_1.jpg']
			);

			expect(result).toBe(1);
			expect(ImageBoardRepository.patchImageBoard).toHaveBeenCalledWith(
				1,
				'testTitle',
				'testContent',
				[{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }],
				['testImage1_1.jpg'],
				{ transaction: mockTransaction }
			);
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_1.jpg', ImageConstants.BOARD_TYPE);
		});

		it('정상 수정. 삭제할 파일이 없는 경우', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_USER_ID);
			jest.spyOn(ImageBoardRepository, 'patchImageBoard').mockResolvedValue(1);
			const result =await patchImageBoardService(
				DEFAULT_USER_ID, 
				1, 
				{ imageTitle: 'testTitle', imageContent: 'testContent' },
				[{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }],
				undefined
			);

			expect(result).toBe(1);
			expect(ImageBoardRepository.patchImageBoard).toHaveBeenCalledWith(
				1,
				'testTitle',
				'testContent',
				[{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }],
				undefined,
				{ transaction: mockTransaction }
			);
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
			expect(deleteImageFile).not.toHaveBeenCalled();
		});

		it('작성자가 아닌 경우', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue('wrongUser');
			jest.spyOn(ImageBoardRepository, 'patchImageBoard');
			try {
				await patchImageBoardService(
					DEFAULT_USER_ID, 
					1, 
					{ imageTitle: 'testTitle', imageContent: 'testContent' }, 
					[{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }], 
					undefined
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(ImageBoardRepository.patchImageBoard).not.toHaveBeenCalled();
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledWith('testImage1.jpg', ImageConstants.BOARD_TYPE);
			}
		});

		it('수정시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_USER_ID);
			jest.spyOn(ImageBoardRepository, 'patchImageBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await patchImageBoardService(
					DEFAULT_USER_ID, 
					1, 
					{ imageTitle: 'testTitle', imageContent: 'testContent' }, 
					[{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }], 
					undefined
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
				expect(deleteImageFile).toHaveBeenCalledWith('testImage1.jpg', ImageConstants.BOARD_TYPE);
			}
		});
	});

	describe('deleteImageBoardService', () => {
		it('정상 삭제', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_USER_ID);
			jest.spyOn(ImageBoardRepository, 'getImageBoardDeleteFiles').mockResolvedValue([{ imageName: 'testImage1_1.jpg' }]);
			jest.spyOn(ImageBoardRepository, 'deleteImageBoard').mockResolvedValue();
			const result = await deleteImageBoardService(1, DEFAULT_USER_ID);
			expect(result).toBe(1);
			expect(ImageBoardRepository.deleteImageBoard).toHaveBeenCalledWith(1);
			expect(ImageBoardRepository.getImageBoardDeleteFiles).toHaveBeenCalledWith(1);
			expect(deleteImageFile).toHaveBeenCalledWith('testImage1_1.jpg', ImageConstants.BOARD_TYPE);
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue('wrongUser');
			jest.spyOn(ImageBoardRepository, 'deleteImageBoard');
			jest.spyOn(ImageBoardRepository, 'getImageBoardDeleteFiles');
			try {
				await deleteImageBoardService(1, DEFAULT_USER_ID);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(ImageBoardRepository.deleteImageBoard).not.toHaveBeenCalled();
				expect(ImageBoardRepository.getImageBoardDeleteFiles).not.toHaveBeenCalled();
				expect(deleteImageFile).not.toHaveBeenCalled();
			}
		});

		it('삭제시 오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_USER_ID);
			jest.spyOn(ImageBoardRepository, 'getImageBoardDeleteFiles').mockResolvedValue([{ imageName: 'testImage1_1.jpg' }]);
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