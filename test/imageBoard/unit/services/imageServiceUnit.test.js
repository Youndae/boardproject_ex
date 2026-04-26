import { ImageBoardRepository } from '#repositories/imageBoardRepository.js';
import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import { jest } from '@jest/globals';
import { ImageConstants } from '#constants/imageConstants.js';
import { sequelize } from '#models/index.js';

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

const SAVE_IMAGE_BOARD_LIST = [
	{
		id: 1,
		title: 'testTitle1',
		content: 'testContent1',
		userId: DEFAULT_MEMBER.id,
		createdAt: new Date(),
		imageName: 'testImage1_1.jpg',
	},
	{
		imageNo: 2,
		imageTitle: 'testTitle2',
		imageContent: 'testContent2',
		userId: DEFAULT_MEMBER.id,
		imageDate: new Date(),
		imageName: 'testImage2_1.jpg',
	},
	{
		imageNo: 3,
		imageTitle: 'testTitle3',
		imageContent: 'testContent3',
		userId: DEFAULT_MEMBER.id,
		imageDate: new Date(),
		imageName: 'testImage3_1.jpg',
	},
];

const SAVE_IMAGE_BOARD_DETAIL = {
	imageNo: 1,
	imageTitle: 'testTitle1',
	imageContent: 'testContent1',
	userId: DEFAULT_MEMBER.id,
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
		it('조회 중 오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardListPageable')
				.mockRejectedValue(new Error('오류 발생'));

			try {
				await getImageBoardListService({page: 1});
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});
	});

	describe('getImageBoardDetailService', () => {
		it('데이터가 없는 경우', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardDetail').mockResolvedValue(null);
			try {
				await getImageBoardDetailService(9999);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('조회시 오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardDetail').mockRejectedValue(new Error('오류 발생'));
			try {
				await getImageBoardDetailService(1);
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
				DEFAULT_MEMBER.id,
				{ title: 'testTitle', content: 'testContent' },
				[
					{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' },
					{ filename: 'testImage2.jpg', originalname: 'testImage_old_2.jpg' },
					{ filename: 'testImage3.jpg', originalname: 'testImage_old_3.jpg' }
				]
			);

			expect(result).toBe(1);
			expect(ImageBoardRepository.postImageBoard)
				.toHaveBeenCalledWith(
					DEFAULT_MEMBER.id,
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
			const postFiles = [{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }];
			try {
				await postImageBoardService(
					DEFAULT_MEMBER.id,
					{ title: 'testTitle', content: 'testContent' },
					postFiles,
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
				expect(deleteBoardImageFromFiles).toHaveBeenCalledWith(postFiles);
			}
		});
	});

	describe('getImageBoardPatchDetailService', () => {
		it('데이터가 없는 경우', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(null);
			const patchDetailSpy = jest.spyOn(ImageBoardRepository, 'getImageBoardPatchDetail');
			try {
				await getImageBoardPatchDetailService(0, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);

				expect(patchDetailSpy).not.toHaveBeenCalled();
			}
		});

		it('조회시 오류 발생', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_MEMBER.id);
			jest.spyOn(ImageBoardRepository, 'getImageBoardPatchDetail').mockRejectedValue(new Error('오류 발생'));
			try {
				await getImageBoardPatchDetailService(1, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}
		});

		it('작성자가 아닌 경우', async () => {
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue('wrongUser');
			const patchDetailSpy = jest.spyOn(ImageBoardRepository, 'getImageBoardPatchDetail');
			try {
				await getImageBoardPatchDetailService(1, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(patchDetailSpy).not.toHaveBeenCalled();
			}
		});
	});

	describe('patchImageBoardService', () => {
		it('정상 수정. 모든 데이터가 존재하는 경우', async () => {
			const deleteFiles = ['testImage1_1.jpg'];
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_MEMBER.id);
			jest.spyOn(ImageBoardRepository, 'patchImageBoard').mockResolvedValue(1);
			const result =await patchImageBoardService(
				DEFAULT_MEMBER.id,
				1, 
				{ title: 'testTitle', content: 'testContent' },
				[{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }],
				deleteFiles
			);

			expect(result).toBe(1);
			expect(ImageBoardRepository.patchImageBoard).toHaveBeenCalledWith(
				1,
				'testTitle',
				'testContent',
				[{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }],
				deleteFiles,
				{ transaction: mockTransaction }
			);
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
			expect(deleteBoardImageFromNames).toHaveBeenCalledWith(deleteFiles);
		});

		it('정상 수정. 삭제할 파일이 없는 경우', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_MEMBER.id);
			jest.spyOn(ImageBoardRepository, 'patchImageBoard').mockResolvedValue(1);
			const result =await patchImageBoardService(
				DEFAULT_MEMBER.id,
				1, 
				{ title: 'testTitle', content: 'testContent' },
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
			const files = [{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }];
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue('wrongUser');
			const patchBoardSpy = jest.spyOn(ImageBoardRepository, 'patchImageBoard');
			try {
				await patchImageBoardService(
					DEFAULT_MEMBER.id,
					1, 
					{ imageTitle: 'testTitle', imageContent: 'testContent' }, 
					files,
					undefined
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);

				expect(patchBoardSpy).not.toHaveBeenCalled();
				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
				expect(deleteBoardImageFromFiles).toHaveBeenCalledWith(files);
			}
		});

		it('수정시 오류 발생', async () => {
			const files = [{ filename: 'testImage1.jpg', originalname: 'testImage_old_1.jpg' }];
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_MEMBER.id);
			jest.spyOn(ImageBoardRepository, 'patchImageBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await patchImageBoardService(
					DEFAULT_MEMBER.id,
					1, 
					{ imageTitle: 'testTitle', imageContent: 'testContent' }, 
					files,
					undefined
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);

				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
				expect(deleteBoardImageFromFiles).toHaveBeenCalledWith(files);
			}
		});
	});

	describe('deleteImageBoardService', () => {
		it('정상 삭제', async () => {
			const deleteFileName = 'testImage1_1.jpg';
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_MEMBER.id);
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardDeleteFiles').mockResolvedValue('testImage1_1.jpg');
			jest.spyOn(ImageBoardRepository, 'deleteImageBoard').mockResolvedValue();
			await deleteImageBoardService(1, DEFAULT_MEMBER.id);

			expect(deleteBoardImageFromNames).toHaveBeenCalledWith(deleteFileName);
			expect(mockTransaction.commit).toHaveBeenCalled();
			expect(mockTransaction.rollback).not.toHaveBeenCalled();
		});

		it('작성자가 아닌 경우', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue('wrongUser');
			const deleteBoardSpy = jest.spyOn(ImageBoardRepository, 'deleteImageBoard');
			const deleteFilesSpy = jest.spyOn(ImageBoardRepository, 'getImageBoardDeleteFiles');
			try {
				await deleteImageBoardService(1, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
				expect(deleteBoardSpy).not.toHaveBeenCalled();
				expect(deleteFilesSpy).not.toHaveBeenCalled();
				expect(deleteBoardImageFromNames).not.toHaveBeenCalled();

				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
			}
		});

		it('데이터가 없는 경우', async () => {
			const mockTransaction ={
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(null);
			const deleteFilesSpy = jest.spyOn(ImageBoardRepository, 'getImageBoardDeleteFiles');
			const deleteBoardSpy = jest.spyOn(ImageBoardRepository, 'deleteImageBoard');

			try {
				await deleteImageBoardService(1, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);

				expect(deleteFilesSpy).not.toHaveBeenCalled();
				expect(deleteBoardSpy).not.toHaveBeenCalled();
				expect(deleteBoardImageFromNames).not.toHaveBeenCalled();

				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
			}
		})

		it('삭제시 오류 발생', async () => {
			const mockTransaction = {
				commit: jest.fn(),
				rollback: jest.fn(),
			}
			const deleteFileName = 'testImage1_1.jpg';
			jest.spyOn(sequelize, 'transaction').mockResolvedValue(mockTransaction);
			jest.spyOn(ImageBoardRepository, 'getImageBoardWriter').mockResolvedValue(DEFAULT_MEMBER.id);
			jest.spyOn(ImageBoardRepository, 'getImageBoardDeleteFiles').mockResolvedValue(deleteFileName);
			jest.spyOn(ImageBoardRepository, 'deleteImageBoard').mockRejectedValue(new Error('오류 발생'));
			try {
				await deleteImageBoardService(1, DEFAULT_MEMBER.id);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
				expect(deleteBoardImageFromNames).not.toHaveBeenCalled();

				expect(mockTransaction.commit).not.toHaveBeenCalled();
				expect(mockTransaction.rollback).toHaveBeenCalled();
			}
		});
	});
});