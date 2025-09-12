import CustomError from '#errors/customError.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import { sequelize, Board, Member, Auth } from '#models/index.js';
import {
	getBoardListService,
	getBoardDetailService,
	postBoardService,
	patchBoardDetailDataService,
	patchBoardService,
	deleteBoardService,
	getReplyDetailService,
	postBoardReplyService,
} from '#services/board/boardService.js';

const BOARD_AMOUNT = 20;
const BOARD_TOTAL_ELEMENTS = 30;
const DEFAULT_USER_ID = 'tester';
const WRONG_USER_ID = 'tester2';

describe('boardService integration test', () => {
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
		await Member.destroy({ where: {} });
		await Auth.destroy({ where: {} });
		await sequelize.close();
	});
	
	beforeEach(async () => {
		for(let i = 1; i <= BOARD_TOTAL_ELEMENTS; i++) {
			await Board.create({
				boardNo: i,
				userId: DEFAULT_USER_ID,
				boardTitle: `testTitle${i}`,
				boardContent: `testContent${i}`,
				boardGroupNo: i,
				boardUpperNo: i.toString(),
				boardIndent: 1,
			});
		}
	});

	afterEach(async () => {
		await Board.destroy({ where: {} });
	});

	describe('getBoardListService', () => {
		it('정상 조회', async () => {
			const result = await getBoardListService({ pageNum: 1 });

			expect(result.content.length).toBe(BOARD_AMOUNT);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(BOARD_TOTAL_ELEMENTS);

			const resultData = result.content[0];

			expect(resultData.boardNo).toBeDefined();
			expect(resultData.boardTitle).toBeDefined();
			expect(resultData.userId).toBeDefined();
			expect(resultData.boardDate).toBeDefined();
			expect(resultData.boardIndent).toBeDefined();
			expect(resultData.boardGroupNo).toBeUndefined();
			expect(resultData.boardUpperNo).toBeUndefined();
		});

		it('데이터가 없는 경우', async () => {
			await Board.destroy({ where: {} });
			const result = await getBoardListService({ pageNum: 1 });
			expect(result.content.length).toBe(0);
			expect(result.empty).toBe(true);
			expect(result.totalElements).toBe(0);
		});

		it('제목 기반 검색', async () => {
			const result = await getBoardListService({ keyword: 'testTitle11', searchType: 't', pageNum: 1 });

			expect(result.content.length).toBe(1);
			expect(result.empty).toBe(false);
			expect(result.totalElements).toBe(1);
		});
	});

	describe('getBoardDetailService', () => {
		it('정상 조회', async () => {
			const result = await getBoardDetailService(1);

			expect(result.boardNo).toBe(1);
			expect(result.boardTitle).toBe('testTitle1');
			expect(result.boardContent).toBe('testContent1');
			expect(result.userId).toBe('tester');
			expect(result.boardDate).toBeDefined();
			expect(result.boardIndent).toBeUndefined();
			expect(result.boardGroupNo).toBeUndefined();
			expect(result.boardUpperNo).toBeUndefined();
		});

		it('데이터가 없는 경우', async () => {
			try {
				await getBoardDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});
	});

	describe('postBoardService', () => {
		beforeEach(async () => {
			await Board.destroy({ where: {} });
		});

		it('정상 저장', async () => {
			const result = await postBoardService(DEFAULT_USER_ID, { boardTitle: 'testTitle', boardContent: 'testContent' });

			expect(result).toBeDefined();

			const saveBoard = await Board.findOne({ where: { boardNo: result } });
			expect(saveBoard.boardTitle).toBe('testTitle');
			expect(saveBoard.boardContent).toBe('testContent');
			expect(saveBoard.userId).toBe(DEFAULT_USER_ID);
			expect(saveBoard.boardDate).toBeDefined();
			expect(saveBoard.boardIndent).toBe(1);
			expect(saveBoard.boardGroupNo).toBe(result);
			expect(saveBoard.boardUpperNo).toBe(result.toString());
		});

		it('저장시 오류 발생', async () => {
			try {
				await postBoardService(DEFAULT_USER_ID, { boardTitle: null, boardContent: 'testContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}

			const saveBoard = await Board.findAll({ where: {} });
			expect(saveBoard.length).toBe(0);
		});
	});

	describe('patchBoardDetailDataService', () => {
		it('정상 조회', async () => {
			const result = await patchBoardDetailDataService(DEFAULT_USER_ID, 1);

			expect(result.boardNo).toBe(1);
			expect(result.boardTitle).toBe('testTitle1');
			expect(result.boardContent).toBe('testContent1');
			expect(result.userId).toBe(DEFAULT_USER_ID);
			expect(result.boardDate).toBeUndefined();
			expect(result.boardIndent).toBeUndefined();
			expect(result.boardGroupNo).toBeUndefined();
			expect(result.boardUpperNo).toBeUndefined();
		});

		it('데이터가 없는 경우', async () => {
			try {
				await patchBoardDetailDataService(DEFAULT_USER_ID, 0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});

		it('작성자가 아닌 경우', async () => {
			try {
				await patchBoardDetailDataService(WRONG_USER_ID, 1);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('patchBoardService', () => {
		it('정상 수정', async () => {
			const saveBoard = await Board.findOne({ where: { boardNo: 1 } });
			const result = await patchBoardService(DEFAULT_USER_ID, 1, { boardTitle: 'testUpdateTitle', boardContent: 'testUpdateContent' });
			expect(result).toBe(1);

			const patchBoard = await Board.findOne({ where: { boardNo: result } });
			expect(patchBoard.boardTitle).toBe('testUpdateTitle');
			expect(patchBoard.boardContent).toBe('testUpdateContent');
			expect(patchBoard.userId).toBe(DEFAULT_USER_ID);
			expect(patchBoard.boardDate).toStrictEqual(saveBoard.boardDate);
			expect(patchBoard.boardIndent).toBe(saveBoard.boardIndent);
			expect(patchBoard.boardGroupNo).toBe(saveBoard.boardGroupNo);
			expect(patchBoard.boardUpperNo).toBe(saveBoard.boardUpperNo);
		});

		it('작성자가 아닌 경우', async () => {
			try {
				await patchBoardService(WRONG_USER_ID, 1, { boardTitle: 'testUpdateTitle', boardContent: 'testUpdateContent' });
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('deleteBoardService', () => {
		it('정상 삭제', async () => {
			await deleteBoardService(DEFAULT_USER_ID, 1);
			
			const deleteBoard = await Board.findOne({ where: { boardNo: 1 } });
			expect(deleteBoard).toBeNull();
		});

		it('작성자가 아닌 경우', async () => {
			try {
				await deleteBoardService(WRONG_USER_ID, 1);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('getReplyDetailService', () => {
		it('정상 조회', async () => {
			const result = await getReplyDetailService(1);

			expect(result.boardGroupNo).toBe(1);
			expect(result.boardUpperNo).toBe('1');
			expect(result.boardIndent).toBe(1);
		});

		it('데이터가 없는 경우', async () => {
			try {
				await getReplyDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});
	});

	describe('postBoardReplyService', () => {
		it('정상 저장', async () => {
			const result = await postBoardReplyService(
				DEFAULT_USER_ID, 
				{ 
					boardTitle: 'testReplyTitle', 
					boardContent: 'testReplyContent', 
					boardGroupNo: 1, 
					boardIndent: 1, 
					boardUpperNo: '1' 
				}
			);

			expect(result).toBeDefined();

			const saveReply = await Board.findOne({ where: { boardNo: result } });
			expect(saveReply.boardTitle).toBe('testReplyTitle');
			expect(saveReply.boardContent).toBe('testReplyContent');
			expect(saveReply.userId).toBe(DEFAULT_USER_ID);
			expect(saveReply.boardDate).toBeDefined();
			expect(saveReply.boardIndent).toBe(2);
			expect(saveReply.boardGroupNo).toBe(1);
			expect(saveReply.boardUpperNo).toBe(`1,${result}`);
		});

		it('저장시 오류 발생', async () => {
			try {
				await postBoardReplyService(
					DEFAULT_USER_ID, 
					{ 
						boardTitle: null, 
						boardContent: 'testReplyContent', 
						boardGroupNo: 1, 
						boardIndent: 1, 
						boardUpperNo: '1' 
					}
				);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}

			const saveReply = await Board.findAll({ where: { boardGroupNo: 1 } });
			expect(saveReply.length).toBe(1);
		});
	});
})