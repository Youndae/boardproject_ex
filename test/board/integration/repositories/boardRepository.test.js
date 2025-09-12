import { BoardRepository } from '#repositories/boardRepository.js';
import { sequelize, Board, Member, Auth } from '#models/index.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import CustomError from '#errors/customError.js';

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

const DEFAULT_MEMBER = SAVE_MEMBER[0];
const BOARD_FIXTURE_LENGTH = 30;

describe('boardRepository test', () => {
	beforeAll(async () => {
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
	});

	beforeEach(async () => {
		for(let i = 1; i <= BOARD_FIXTURE_LENGTH; i++) {
			await Board.create({
				boardNo: i,
				userId: DEFAULT_MEMBER.userId,
				boardTitle: `testTitle${i}`,
				boardContent: `testContent${i}`,
				boardGroupNo: i,
				boardUpperNo: i.toString(),
			});
		}

		await Board.create({
			boardNo: BOARD_FIXTURE_LENGTH + 1,
			userId: DEFAULT_MEMBER.userId,
			boardTitle: `testTitle${BOARD_FIXTURE_LENGTH + 1}`,
			boardContent: `testContent${BOARD_FIXTURE_LENGTH + 1}`,
			boardGroupNo: BOARD_FIXTURE_LENGTH,
			boardUpperNo: `${BOARD_FIXTURE_LENGTH},${BOARD_FIXTURE_LENGTH + 1}`,
			boardIndent: 2,
		});

		await Board.create({
			boardNo: BOARD_FIXTURE_LENGTH + 2,
			userId: DEFAULT_MEMBER.userId,
			boardTitle: `testTitle${BOARD_FIXTURE_LENGTH + 2}`,
			boardContent: `testContent${BOARD_FIXTURE_LENGTH + 2}`,
			boardGroupNo: BOARD_FIXTURE_LENGTH,
			boardUpperNo: `${BOARD_FIXTURE_LENGTH},${BOARD_FIXTURE_LENGTH + 2}`,
			boardIndent: 2,
		})

		await Board.create({
			boardNo: BOARD_FIXTURE_LENGTH + 3,
			userId: DEFAULT_MEMBER.userId,
			boardTitle: `testTitle${BOARD_FIXTURE_LENGTH + 3}`,
			boardContent: `testContent${BOARD_FIXTURE_LENGTH + 3}`,
			boardGroupNo: BOARD_FIXTURE_LENGTH,
			boardUpperNo: `${BOARD_FIXTURE_LENGTH},${BOARD_FIXTURE_LENGTH + 1},${BOARD_FIXTURE_LENGTH + 3}`,
			boardIndent: 3,
		})
	})

	afterEach(async () => {
		await Board.destroy({ where: {} });
	});

	describe('getBoardListPageable', () => {
		it('정상 조회', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: '', searchType: '', pageNum: 1 });
			expect(boardList.count).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows.length).toBe(20);

			expect(boardList.rows[0].boardNo).toBe(BOARD_FIXTURE_LENGTH);
			expect(boardList.rows[1].boardNo).toBe(BOARD_FIXTURE_LENGTH + 1);
			expect(boardList.rows[2].boardNo).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows[3].boardNo).toBe(BOARD_FIXTURE_LENGTH + 2);
		});

		it('제목 기준 검색 조회. 다중 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testTitle', searchType: 't', pageNum: 1 });

			expect(boardList.count).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows.length).toBe(20);

			expect(boardList.rows[0].boardNo).toBe(BOARD_FIXTURE_LENGTH);
			expect(boardList.rows[1].boardNo).toBe(BOARD_FIXTURE_LENGTH + 1);
			expect(boardList.rows[2].boardNo).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows[3].boardNo).toBe(BOARD_FIXTURE_LENGTH + 2);
		});

		it('제목 기준 검색 조회. 단일 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testTitle11', searchType: 't', pageNum: 1 });

			expect(boardList.count).toBe(1);
			expect(boardList.rows.length).toBe(1);

			expect(boardList.rows[0].boardNo).toBe(11);
		});

		it('제목 기준 검색 조회. 다중 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testContent', searchType: 'c', pageNum: 1 });

			expect(boardList.count).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows.length).toBe(20);

			expect(boardList.rows[0].boardNo).toBe(BOARD_FIXTURE_LENGTH);
			expect(boardList.rows[1].boardNo).toBe(BOARD_FIXTURE_LENGTH + 1);
			expect(boardList.rows[2].boardNo).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows[3].boardNo).toBe(BOARD_FIXTURE_LENGTH + 2);
		})

		it('내용 기준 검색 조회. 단일 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testContent11', searchType: 'c', pageNum: 1 });

			expect(boardList.count).toBe(1);
			expect(boardList.rows.length).toBe(1);

			expect(boardList.rows[0].boardNo).toBe(11);
		});

		it('제목 및 내용 기준 검색 조회. 다중 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testTitle', searchType: 'tc', pageNum: 1 });

			expect(boardList.count).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows.length).toBe(20);
			
			expect(boardList.rows[0].boardNo).toBe(BOARD_FIXTURE_LENGTH);
			expect(boardList.rows[1].boardNo).toBe(BOARD_FIXTURE_LENGTH + 1);
			expect(boardList.rows[2].boardNo).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows[3].boardNo).toBe(BOARD_FIXTURE_LENGTH + 2);
		});
		
		it('재목 및 내용 기준 검색 조회. 단일 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testTitle11', searchType: 'tc', pageNum: 1 });

			expect(boardList.count).toBe(1);
			expect(boardList.rows.length).toBe(1);

			expect(boardList.rows[0].boardNo).toBe(11);
		});

		it('유저 기준 검색 조회.', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'tester', searchType: 'u', pageNum: 1 });

			expect(boardList.count).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows.length).toBe(20);
		});

		it('데이터가 하나도 없는 경우', async () => {
			await Board.destroy({ where: {} });
			const boardList = await BoardRepository.getBoardListPageable({ keyword: '', searchType: '', pageNum: 1 });

			expect(boardList.count).toBe(0);
			expect(boardList.rows.length).toBe(0);
		});
	});

	describe('getBoardDetail', () => {
		it('정상 조회', async () => {
			const board = await BoardRepository.getBoardDetail(1);

			expect(board.boardNo).toBe(1);
			expect(board.boardTitle).toBe('testTitle1');
			expect(board.boardContent).toBe('testContent1');
			expect(board.userId).toBe('tester');
			expect(board.boardDate).toBeDefined();
			expect(board.boardIndent).toBeUndefined();
			expect(board.boardGroupNo).toBeUndefined();
			expect(board.boardUpperNo).toBeUndefined();
		});

		it('데이터가 없는 경우', async () => {
			try {
				await BoardRepository.getBoardDetail(0);
			}catch (error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});
	});

	describe('postBoard', () => {
		it('정상 저장', async () => {
			const boardNo = await BoardRepository.postBoard('testTitle', 'testContent', 'tester');

			expect(boardNo).toBeDefined();

			const saveBoard = await Board.findOne({ where: { boardNo: boardNo } });

			expect(saveBoard.boardTitle).toBe('testTitle');
			expect(saveBoard.boardContent).toBe('testContent');
			expect(saveBoard.userId).toBe('tester');
			expect(saveBoard.boardDate).toBeDefined();
			expect(saveBoard.boardIndent).toBe(1);
			expect(saveBoard.boardGroupNo).toBe(boardNo);
			expect(saveBoard.boardUpperNo).toBe(boardNo.toString());
		});
	});

	describe('getPatchDetailData', () => {
		it('정상 조회', async () => {
			const board = await BoardRepository.getPatchDetailData(1, 'tester');

			expect(board.boardNo).toBe(1);
			expect(board.boardTitle).toBe('testTitle1');
			expect(board.boardContent).toBe('testContent1');
			expect(board.userId).toBe('tester');
			expect(board.boardDate).toBeUndefined();
			expect(board.boardIndent).toBeUndefined();
			expect(board.boardGroupNo).toBeUndefined();
			expect(board.boardUpperNo).toBeUndefined();
		});
		
		it('데이터가 없는 경우', async () => {
			try {
				await BoardRepository.getPatchDetailData(0, 'tester');
			}catch (error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});

		it('작성자가 아닌 경우', async () => {
			try {
				await BoardRepository.getPatchDetailData(1, 'tester2');
			}catch (error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.FORBIDDEN.CODE);
				expect(error.message).toBe(ResponseStatus.FORBIDDEN.MESSAGE);
			}
		});
	});

	describe('patchBoard', () => {
		it('정상 수정', async () => {
			await BoardRepository.patchBoard(1, 'testTitle1', 'testContent1');

			const board = await Board.findOne({ where: { boardNo: 1 } });
			expect(board.boardTitle).toBe('testTitle1');
			expect(board.boardContent).toBe('testContent1');
		});
	});

	describe('deleteBoard', () => {
		it('정상 삭제', async () => {
			await BoardRepository.deleteBoard(1);

			const board = await Board.findOne({ where: { boardNo: 1 } });
			expect(board).toBeNull();
		});
	});

	describe('getReplyDetail', () => {
		it('정상 조회', async () => {
			const reply = await BoardRepository.getReplyDetail(1);

			expect(reply.boardGroupNo).toBe(1);
			expect(reply.boardUpperNo).toBe('1');
			expect(reply.boardIndent).toBe(1);
		});

		it('데이터가 없는 경우', async () => {
			try {
				await BoardRepository.getReplyDetail(0);
			}catch (error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});
	});

	describe('postBoardReply', () => {
		it('정상 저장', async () => {
			const replyNo = await BoardRepository.postBoardReply('testReplyTitle', 'testReplyContent', 1, 2, '1', 'tester');

			expect(replyNo).toBeDefined();

			const saveReply = await Board.findOne({ where: { boardNo: replyNo } });

			expect(saveReply.boardTitle).toBe('testReplyTitle');
			expect(saveReply.boardContent).toBe('testReplyContent');
			expect(saveReply.userId).toBe('tester');
			expect(saveReply.boardDate).toBeDefined();
			expect(saveReply.boardIndent).toBe(2);
			expect(saveReply.boardGroupNo).toBe(1);
			expect(saveReply.boardUpperNo).toBe(`1,${replyNo}`);
		});
	})
});