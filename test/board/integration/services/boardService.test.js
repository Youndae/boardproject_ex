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
import {BoardRepository} from "#repositories/boardRepository.js";

const BOARD_AMOUNT = 20;
const BOARD_TOTAL_ELEMENTS = 30;
const DEFAULT_MEMBER = {
	id: 1,
	userId: 'tester',
	password: 'tester1234',
	username: 'testerName',
	nickname: 'testerNickName',
	email: 'tester@tester.com',
	profile: 'testerProfileThumbnail.jpg',
	provider: 'local'
}

const WRONG_USER_ID = 2;

describe('boardService integration test', () => {
	beforeAll(async () => {
		await sequelize.authenticate();
		await sequelize.sync({ force: true });

		await Member.create({
			id: DEFAULT_MEMBER.id,
			userId: DEFAULT_MEMBER.userId,
			password: DEFAULT_MEMBER.password,
			username: DEFAULT_MEMBER.username,
			nickname: DEFAULT_MEMBER.nickname,
			email: DEFAULT_MEMBER.email,
			profile: DEFAULT_MEMBER.profile,
			provider: DEFAULT_MEMBER.provider,
		});

		await Auth.create({
			userId: DEFAULT_MEMBER.id,
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
				id: i,
				userId: DEFAULT_MEMBER.id,
				title: `testTitle${i}`,
				content: `testContent${i}`,
				groupNo: i,
				upperNo: i.toString(),
				indent: 1,
			});
		}
	});

	afterEach(async () => {
		await Board.destroy({ where: {} });
	});

	describe('getBoardListService', () => {
		it('정상 조회', async () => {
			const result = await getBoardListService({ page: 1 });

			expect(result.items.length).toBe(BOARD_AMOUNT);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(Math.ceil(BOARD_TOTAL_ELEMENTS / BOARD_AMOUNT));
			expect(result.currentPage).toBe(1);


			result.items.forEach(item => {
				const itemResult = item.get({ plain: true })
				expect(itemResult.id).toBeDefined();
				expect(itemResult.title).toBeDefined();
				expect(itemResult.writer).toBeDefined();
				expect(itemResult.createdAt).toBeDefined();
				expect(itemResult.indent).toBeDefined();
				expect(itemResult.groupNo).toBeUndefined();
				expect(itemResult.upperNo).toBeUndefined();
			})
		});

		it('데이터가 없는 경우', async () => {
			await Board.destroy({ where: {} });
			const result = await getBoardListService({ page: 1 });
			expect(result.items.length).toBe(0);
			expect(result.isEmpty).toBe(true);
			expect(result.totalPages).toBe(0);
			expect(result.currentPage).toBe(1);
		});

		it('제목 기반 검색', async () => {
			const result = await getBoardListService({ keyword: 'testTitle11', searchType: 't', page: 1 });

			expect(result.items.length).toBe(1);
			expect(result.isEmpty).toBe(false);
			expect(result.totalPages).toBe(1);
			expect(result.currentPage).toBe(1);
		});
	});

	describe('getBoardDetailService', () => {
		it('정상 조회', async () => {
			const result = await getBoardDetailService(1);

			expect(result.id).toBeUndefined();
			expect(result.title).toBe('testTitle1');
			expect(result.content).toBe('testContent1');
			expect(result.writer).toBe(DEFAULT_MEMBER.nickname);
			expect(result.writerId).toBe(DEFAULT_MEMBER.userId);
			expect(result.createdAt).toBeDefined();
			expect(result.indent).toBeUndefined();
			expect(result.groupNo).toBeUndefined();
			expect(result.upperNo).toBeUndefined();
		});

		it('데이터가 없는 경우', async () => {
			try {
				await getBoardDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});
	});

	describe('postBoardService', () => {
		beforeEach(async () => {
			await Board.destroy({ where: {} });
		});

		it('정상 저장', async () => {
			const result = await postBoardService(DEFAULT_MEMBER.id, { title: 'testTitle', content: 'testContent' });

			expect(result).toBeDefined();

			const saveBoard = await Board.findOne({ where: { id: result } });
			expect(saveBoard.title).toBe('testTitle');
			expect(saveBoard.content).toBe('testContent');
			expect(saveBoard.userId).toBe(DEFAULT_MEMBER.id);
			expect(saveBoard.createdAt).toBeDefined();
			expect(saveBoard.indent).toBe(0);
			expect(saveBoard.groupNo).toBe(result);
			expect(saveBoard.upperNo).toBe(result.toString());
		});

		it('저장시 오류 발생', async () => {
			try {
				await postBoardService(DEFAULT_MEMBER.id, { boardTitle: null, boardContent: 'testContent' });
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
			const result = await patchBoardDetailDataService(DEFAULT_MEMBER.id, 1);

			expect(result.id).toBeUndefined();
			expect(result.title).toBe('testTitle1');
			expect(result.content).toBe('testContent1');
			expect(result.userId).toBeUndefined();
			expect(result.createdAt).toBeUndefined();
			expect(result.indent).toBeUndefined();
			expect(result.groupNo).toBeUndefined();
			expect(result.upperNo).toBeUndefined();
		});

		it('데이터가 없는 경우', async () => {
			try {
				await patchBoardDetailDataService(DEFAULT_MEMBER.id, 0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});

		it('작성자가 아닌 경우', async () => {
			const board = await BoardRepository.getBoardListPageable({ });

			try {
				await patchBoardDetailDataService(WRONG_USER_ID, 1);
			}catch(error) {
				console.log('writer error', error);
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('patchBoardService', () => {
		it('정상 수정', async () => {
			const saveBoard = await Board.findOne({ where: { id: 1 } });
			const result = await patchBoardService(DEFAULT_MEMBER.id, 1, { title: 'testUpdateTitle', content: 'testUpdateContent' });
			expect(result).toBe(1);

			const patchBoard = await Board.findOne({ where: { id: result } });
			expect(patchBoard.title).toBe('testUpdateTitle');
			expect(patchBoard.content).toBe('testUpdateContent');
			expect(patchBoard.userId).toBe(DEFAULT_MEMBER.id);
			expect(patchBoard.createdAt).toStrictEqual(saveBoard.createdAt);
			expect(patchBoard.indent).toBe(saveBoard.indent);
			expect(patchBoard.groupNo).toBe(saveBoard.groupNo);
			expect(patchBoard.upperNo).toBe(saveBoard.upperNo);
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
			await deleteBoardService(DEFAULT_MEMBER.id, 1);
			
			const deleteBoard = await Board.findOne({ where: { id: 1 } });
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
			await getReplyDetailService(1);
		});

		it('데이터가 없는 경우', async () => {
			try {
				await getReplyDetailService(0);
			}catch(error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.BAD_REQUEST.CODE);
				expect(error.message).toBe(ResponseStatus.BAD_REQUEST.MESSAGE);
			}
		});
	});

	describe('postBoardReplyService', () => {
		it('정상 저장', async () => {
			const result = await postBoardReplyService(
				DEFAULT_MEMBER.id,
				1,
				{
					title: 'testReplyTitle',
					content: 'testReplyContent'
				}
			);

			expect(result).toBeDefined();

			const saveReply = await Board.findOne({ where: { id: result } });
			expect(saveReply.title).toBe('testReplyTitle');
			expect(saveReply.content).toBe('testReplyContent');
			expect(saveReply.userId).toBe(DEFAULT_MEMBER.id);
			expect(saveReply.createdAt).toBeDefined();
			expect(saveReply.indent).toBe(2);
			expect(saveReply.groupNo).toBe(1);
			expect(saveReply.upperNo).toBe(`1,${result}`);
		});

		it('저장시 오류 발생', async () => {
			try {
				await postBoardReplyService(
					DEFAULT_MEMBER.id,
					1,
					{ 
						title: null,
						content: 'testReplyContent'
					}
				);
			}catch(error) {
				console.log('error: ', error);
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.CODE);
				expect(error.message).toBe(ResponseStatus.INTERNAL_SERVER_ERROR.MESSAGE);
			}

			const saveReply = await Board.findAll({ where: { groupNo: 1 } });
			expect(saveReply.length).toBe(1);
		});
	});
})