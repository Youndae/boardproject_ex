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

const SAVE_MEMBER = {
	id: 1,
	userId: 'tester',
	password: 'tester1234',
	username: 'testerName',
	nickname: 'testerNickName',
	email: 'tester@tester.com',
	profile: 'testerProfile.jpg',
	provider: 'local',
}

const BOARD_FIXTURE_LENGTH = 20;
const BOARD_AMOUNT = 15;
const DEFAULT_USER_ID = 1;

describe('imageBoardRepository test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		await Member.create({
			id: SAVE_MEMBER.id,
			userId: SAVE_MEMBER.userId,
			password: SAVE_MEMBER.password,
			username: SAVE_MEMBER.username,
			nickname: SAVE_MEMBER.nickname,
			email: SAVE_MEMBER.email,
			profile: SAVE_MEMBER.profile,
			provider: SAVE_MEMBER.provider,
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
				id: i,
				userId: DEFAULT_USER_ID,
				title: `testTitle${i}`,
				content: `testContent${i}`,
			});

			for(let j = 1; j <= 3; j++) {
				await ImageData.create({
					imageName: `testImage${i}_${j}.jpg`,
					imageId: i,
					originName: `testImage_old_${i}_${j}.jpg`,
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
			const result = await ImageBoardRepository.getImageBoardListPageable({page: 1});

			expect(result.items.length).toBe(BOARD_AMOUNT);
			expect(result.totalPages).toBe(Math.ceil(BOARD_FIXTURE_LENGTH / BOARD_AMOUNT));
			expect(result.isEmpty).toBeFalsy();
			expect(result.currentPage).toBe(1);

			expect(result.items[0].id).toBe(BOARD_FIXTURE_LENGTH);
			expect(result.items[1].id).toBe(BOARD_FIXTURE_LENGTH - 1);
			expect(result.items[2].id).toBe(BOARD_FIXTURE_LENGTH - 2);
			expect(result.items[3].id).toBe(BOARD_FIXTURE_LENGTH - 3);

			result.items.forEach((item) => {
				expect(item.imageName).toBe(`testImage${item.id}_1.jpg`);
			});
		});

		it('데이터가 없는 경우', async () => {
			await ImageBoard.destroy({ where: {} });
			const result = await ImageBoardRepository.getImageBoardListPageable({page: 1});

			expect(result.items.length).toBe(0);
			expect(result.totalPages).toBe(0);
			expect(result.isEmpty).toBeTruthy();
			expect(result.currentPage).toBe(1);
		});

		it('제목 기준 검색 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardListPageable({keyword: 'testTitle11', searchType: 't', page: 1});

			expect(result.items.length).toBe(1);
			expect(result.totalPages).toBe(1);
			expect(result.isEmpty).toBeFalsy();
			expect(result.currentPage).toBe(1);
			
			expect(result.items[0].id).toBe(11);
		});

		it('내용 기준 검색 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardListPageable({keyword: 'testContent11', searchType: 'c', page: 1});

			expect(result.items.length).toBe(1);
			expect(result.totalPages).toBe(1);
			expect(result.isEmpty).toBeFalsy();
			expect(result.currentPage).toBe(1);
			
		});

		it('제목 및 내용 기준 검색 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardListPageable({keyword: 'testTitle11', searchType: 'tc', page: 1});

			expect(result.items.length).toBe(1);
			expect(result.totalPages).toBe(1);
			expect(result.isEmpty).toBeFalsy();
			expect(result.currentPage).toBe(1);
		});

		it('유저 기준 검색 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardListPageable({keyword: 'testerNickName', searchType: 'u', page: 1});

			expect(result.items.length).toBe(BOARD_AMOUNT);
			expect(result.totalPages).toBe(Math.ceil(BOARD_FIXTURE_LENGTH / BOARD_AMOUNT));
			expect(result.isEmpty).toBeFalsy();
			expect(result.currentPage).toBe(1);
		});
	});

	describe('getImageBoardDetail', () => {
		it('정상 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardDetail(1);

			expect(result.title).toBe('testTitle1');
			expect(result.content).toBe('testContent1');
			expect(result.writer).toBe(SAVE_MEMBER.nickname);
			expect(result.writerId).toBe(SAVE_MEMBER.userId);
			expect(result.createdAt).toBeDefined();
			expect(result.imageDataList.length).toBe(3);
			expect(result.imageDataList[0]).toBe('testImage1_1.jpg');
			expect(result.imageDataList[1]).toBe('testImage1_2.jpg');
			expect(result.imageDataList[2]).toBe('testImage1_3.jpg');
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

			const saveImageBoard = await ImageBoard.findOne({ where: { id: result } });
			expect(saveImageBoard.title).toBe('testTitle');
			expect(saveImageBoard.content).toBe('testContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageId: result } });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName).toBe('testPostImage1.jpg');
			expect(saveImageData[0].originName).toBe('testPostImage_old_1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName).toBe('testPostImage2.jpg');
			expect(saveImageData[1].originName).toBe('testPostImage_old_2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName).toBe('testPostImage3.jpg');
			expect(saveImageData[2].originName).toBe('testPostImage_old_3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);
		});
	});

	describe('getImageBoardPatchDetail', () => {
		it('정상 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardPatchDetail(1);

			expect(result.title).toBe('testTitle1');
			expect(result.content).toBe('testContent1');
			expect(result.createdAt).toBeUndefined();
			expect(result.userId).toBeUndefined();
			expect(result.imageList.length).toBe(3);
			expect(result.imageList[0].imageName).toBe('testImage1_1.jpg');
			expect(result.imageList[0].originName).toBe('testImage_old_1_1.jpg');
			expect(result.imageList[0].imageStep).toBe(1);
			expect(result.imageList[1].imageName).toBe('testImage1_2.jpg');
			expect(result.imageList[1].originName).toBe('testImage_old_1_2.jpg');
			expect(result.imageList[1].imageStep).toBe(2);
			expect(result.imageList[2].imageName).toBe('testImage1_3.jpg');
			expect(result.imageList[2].originName).toBe('testImage_old_1_3.jpg');
			expect(result.imageList[2].imageStep).toBe(3);
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

			const saveImageBoard = await ImageBoard.findOne({ where: { id: result } });
			expect(saveImageBoard.title).toBe('testUpdateTitle');
			expect(saveImageBoard.content).toBe('testUpdateContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);
			
			const saveImageData = await ImageData.findAll({ where: { imageId: result }, order: [['imageStep', 'ASC']] });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(saveImageData[0].originName).toBe('testImage_old_1_3.jpg');
			expect(saveImageData[0].imageStep).toBe(3);
			expect(saveImageData[1].imageName).toBe('testPatchImage1_10.jpg');
			expect(saveImageData[1].originName).toBe('testPatchImage_old_1_10.jpg');
			expect(saveImageData[1].imageStep).toBe(4);
			expect(saveImageData[2].imageName).toBe('testPatchImage1_20.jpg');
			expect(saveImageData[2].originName).toBe('testPatchImage_old_1_20.jpg');
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

			const saveImageBoard = await ImageBoard.findOne({ where: { id: result } });
			expect(saveImageBoard.title).toBe('testUpdateTitle');
			expect(saveImageBoard.content).toBe('testUpdateContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageId: result }, order: [['imageStep', 'ASC']] });
			expect(saveImageData.length).toBe(1);
			expect(saveImageData[0].imageName).toBe('testImage1_3.jpg');
			expect(saveImageData[0].originName).toBe('testImage_old_1_3.jpg');
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

			const saveImageBoard = await ImageBoard.findOne({ where: { id: result } });
			expect(saveImageBoard.title).toBe('testUpdateTitle');
			expect(saveImageBoard.content).toBe('testUpdateContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageId: result }, order: [['imageStep', 'ASC']] });
			expect(saveImageData.length).toBe(4);
			expect(saveImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(saveImageData[0].originName).toBe('testImage_old_1_1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(saveImageData[1].originName).toBe('testImage_old_1_2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(saveImageData[2].originName).toBe('testImage_old_1_3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);
			expect(saveImageData[3].imageName).toBe('testPatchImage1_10.jpg');
			expect(saveImageData[3].originName).toBe('testPatchImage_old_1_10.jpg');
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

			const saveImageBoard = await ImageBoard.findOne({ where: { id: result } });
			expect(saveImageBoard.title).toBe('testUpdateTitle');
			expect(saveImageBoard.content).toBe('testUpdateContent');
			expect(saveImageBoard.userId).toBe(DEFAULT_USER_ID);

			const saveImageData = await ImageData.findAll({ where: { imageId: result }, order: [['imageStep', 'ASC']] });
			expect(saveImageData.length).toBe(3);
			expect(saveImageData[0].imageName).toBe('testImage1_1.jpg');
			expect(saveImageData[0].originName).toBe('testImage_old_1_1.jpg');
			expect(saveImageData[0].imageStep).toBe(1);
			expect(saveImageData[1].imageName).toBe('testImage1_2.jpg');
			expect(saveImageData[1].originName).toBe('testImage_old_1_2.jpg');
			expect(saveImageData[1].imageStep).toBe(2);
			expect(saveImageData[2].imageName).toBe('testImage1_3.jpg');
			expect(saveImageData[2].originName).toBe('testImage_old_1_3.jpg');
			expect(saveImageData[2].imageStep).toBe(3);
		});
	});

	describe('deleteImageBoard', () => {
		it('정상 삭제', async () => {
			const result = await ImageBoardRepository.deleteImageBoard(1);

			expect(result).toBeUndefined();

			const saveImageBoard = await ImageBoard.findOne({ where: { id: 1 } });
			expect(saveImageBoard).toBeNull();
		});
	})

	describe('getImageBoardWriter', () => {
		it('정상 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardWriter(1);

			expect(result).toBe(DEFAULT_USER_ID);
		});

		it('데이터가 없는 경우', async () => {
			const result = await ImageBoardRepository.getImageBoardWriter(0);

			expect(result).toBeNull();
		});
	});
	
	describe('getImageBoardDeleteFiles', () => {
		it('정상 조회', async () => {
			const result = await ImageBoardRepository.getImageBoardDeleteFiles(1);

			expect(result.length).toBe(3);
			expect(result[0]).toBe('testImage1_1.jpg');
			expect(result[1]).toBe('testImage1_2.jpg');
			expect(result[2]).toBe('testImage1_3.jpg');
		});
	});
})