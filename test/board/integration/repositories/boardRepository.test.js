import { BoardRepository } from '#repositories/boardRepository.js';
import { sequelize, Board, Member, Auth } from '#models/index.js';
import { ResponseStatus } from '#constants/responseStatus.js';
import CustomError from '#errors/customError.js';

const SAVE_MEMBER = [
	{
		id: 1,
		userId: 'tester',
		password: 'tester1234',
		username: 'testerName',
		nickname: 'testernickname',
		email: 'tester@tester.com',
		profile: 'testerprofile.jpg',
		provider: 'local',
	},
	{
		id: 2,
		userId: 'tester2',
		password: 'tester1234',
		username: 'testerName2',
		nickname: 'testernickname2',
		email: 'tester2@tester.com',
		profile: 'testerprofile2.jpg',
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
				id: member.id,
				userId: member.userId,
				password: member.userPw,
				username: member.username,
				nickname: member.nickname,
				email: member.email,
				profile: member.profile,
				provider: member.provider,
			});

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
	});

	beforeEach(async () => {
		for(let i = 1; i <= BOARD_FIXTURE_LENGTH; i++) {
			await Board.create({
				id: i,
				userId: DEFAULT_MEMBER.id,
				title: `testTitle${i}`,
				content: `testContent${i}`,
				groupNo: i,
				upperNo: i.toString(),
			});
		}

		await Board.create({
			id: BOARD_FIXTURE_LENGTH + 1,
			userId: DEFAULT_MEMBER.id,
			title: `testTitle${BOARD_FIXTURE_LENGTH + 1}`,
			content: `testContent${BOARD_FIXTURE_LENGTH + 1}`,
			groupNo: BOARD_FIXTURE_LENGTH,
			upperNo: `${BOARD_FIXTURE_LENGTH},${BOARD_FIXTURE_LENGTH + 1}`,
			indent: 2,
		});

		await Board.create({
			id: BOARD_FIXTURE_LENGTH + 2,
			userId: DEFAULT_MEMBER.id,
			title: `testTitle${BOARD_FIXTURE_LENGTH + 2}`,
			content: `testContent${BOARD_FIXTURE_LENGTH + 2}`,
			groupNo: BOARD_FIXTURE_LENGTH,
			upperNo: `${BOARD_FIXTURE_LENGTH},${BOARD_FIXTURE_LENGTH + 2}`,
			indent: 2,
		})

		await Board.create({
			id: BOARD_FIXTURE_LENGTH + 3,
			userId: DEFAULT_MEMBER.id,
			title: `testTitle${BOARD_FIXTURE_LENGTH + 3}`,
			content: `testContent${BOARD_FIXTURE_LENGTH + 3}`,
			groupNo: BOARD_FIXTURE_LENGTH,
			upperNo: `${BOARD_FIXTURE_LENGTH},${BOARD_FIXTURE_LENGTH + 1},${BOARD_FIXTURE_LENGTH + 3}`,
			indent: 3,
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

			expect(boardList.rows[0].id).toBe(BOARD_FIXTURE_LENGTH);
			expect(boardList.rows[1].id).toBe(BOARD_FIXTURE_LENGTH + 1);
			expect(boardList.rows[2].id).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows[3].id).toBe(BOARD_FIXTURE_LENGTH + 2);
		});

		it('제목 기준 검색 조회. 다중 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testTitle', searchType: 't', pageNum: 1 });

			expect(boardList.count).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows.length).toBe(20);

			expect(boardList.rows[0].id).toBe(BOARD_FIXTURE_LENGTH);
			expect(boardList.rows[1].id).toBe(BOARD_FIXTURE_LENGTH + 1);
			expect(boardList.rows[2].id).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows[3].id).toBe(BOARD_FIXTURE_LENGTH + 2);
		});

		it('제목 기준 검색 조회. 단일 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testTitle11', searchType: 't', pageNum: 1 });

			expect(boardList.count).toBe(1);
			expect(boardList.rows.length).toBe(1);

			expect(boardList.rows[0].id).toBe(11);
		});

		it('제목 기준 검색 조회. 다중 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testContent', searchType: 'c', pageNum: 1 });

			expect(boardList.count).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows.length).toBe(20);

			expect(boardList.rows[0].id).toBe(BOARD_FIXTURE_LENGTH);
			expect(boardList.rows[1].id).toBe(BOARD_FIXTURE_LENGTH + 1);
			expect(boardList.rows[2].id).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows[3].id).toBe(BOARD_FIXTURE_LENGTH + 2);
		})

		it('내용 기준 검색 조회. 단일 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testContent11', searchType: 'c', pageNum: 1 });

			expect(boardList.count).toBe(1);
			expect(boardList.rows.length).toBe(1);

			expect(boardList.rows[0].id).toBe(11);
		});

		it('제목 및 내용 기준 검색 조회. 다중 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testTitle', searchType: 'tc', pageNum: 1 });

			expect(boardList.count).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows.length).toBe(20);
			
			expect(boardList.rows[0].id).toBe(BOARD_FIXTURE_LENGTH);
			expect(boardList.rows[1].id).toBe(BOARD_FIXTURE_LENGTH + 1);
			expect(boardList.rows[2].id).toBe(BOARD_FIXTURE_LENGTH + 3);
			expect(boardList.rows[3].id).toBe(BOARD_FIXTURE_LENGTH + 2);
		});
		
		it('재목 및 내용 기준 검색 조회. 단일 결과', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: 'testTitle11', searchType: 'tc', pageNum: 1 });

			expect(boardList.count).toBe(1);
			expect(boardList.rows.length).toBe(1);

			expect(boardList.rows[0].id).toBe(11);
		});

		it('유저 기준 검색 조회.', async () => {
			const boardList = await BoardRepository.getBoardListPageable({ keyword: DEFAULT_MEMBER.nickname, searchType: 'u', pageNum: 1 });

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

			expect(board.id).toBe(1);
			expect(board.title).toBe('testTitle1');
			expect(board.content).toBe('testContent1');
			expect(board.userId).toBe(DEFAULT_MEMBER.id);
			expect(board.createdAt).toBeDefined();
			expect(board.indent).toBeUndefined();
			expect(board.groupNo).toBeUndefined();
			expect(board.upperNo).toBeUndefined();
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
			const id = await BoardRepository.postBoard('testTitle', 'testContent', DEFAULT_MEMBER.id);

			expect(id).toBeDefined();

			const saveBoard = await Board.findOne({ where: { id: id} });

			expect(saveBoard.title).toBe('testTitle');
			expect(saveBoard.content).toBe('testContent');
			expect(saveBoard.userId).toBe(DEFAULT_MEMBER.id);
			expect(saveBoard.createdAt).toBeDefined();
			expect(saveBoard.indent).toBe(1);
			expect(saveBoard.groupNo).toBe(id);
			expect(saveBoard.upperNo).toBe(id.toString());
		});
	});

	describe('getPatchDetailData', () => {
		it('정상 조회', async () => {
			const board = await BoardRepository.getPatchDetailData(1, DEFAULT_MEMBER.id);

			expect(board.id).toBe(1);
			expect(board.title).toBe('testTitle1');
			expect(board.content).toBe('testContent1');
			expect(board.userId).toBe(DEFAULT_MEMBER.id);
			expect(board.createdAt).toBeUndefined();
			expect(board.indent).toBeUndefined();
			expect(board.groupNo).toBeUndefined();
			expect(board.upperNo).toBeUndefined();
		});
		
		it('데이터가 없는 경우', async () => {
			try {
				await BoardRepository.getPatchDetailData(0, DEFAULT_MEMBER.id);
			}catch (error) {
				expect(error).toBeInstanceOf(CustomError);
				expect(error.status).toBe(ResponseStatus.NOT_FOUND.CODE);
				expect(error.message).toBe(ResponseStatus.NOT_FOUND.MESSAGE);
			}
		});

		it('작성자가 아닌 경우', async () => {
			try {
				await BoardRepository.getPatchDetailData(1, 3);
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

			const board = await Board.findOne({ where: { id: 1 } });
			expect(board.title).toBe('testTitle1');
			expect(board.content).toBe('testContent1');
		});
	});

	describe('deleteBoard', () => {
		it('정상 삭제', async () => {
			await BoardRepository.deleteBoard(1);

			const board = await Board.findOne({ where: { id: 1 } });
			expect(board).toBeNull();
		});
	});

	describe('getReplyDetail', () => {
		it('정상 조회', async () => {
			const reply = await BoardRepository.getReplyDetail(1);

			expect(reply.groupNo).toBe(1);
			expect(reply.upperNo).toBe('1');
			expect(reply.indent).toBe(1);
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
			const replyNo = await BoardRepository.postBoardReply('testReplyTitle', 'testReplyContent', 1, 2, '1', DEFAULT_MEMBER.id);

			expect(replyNo).toBeDefined();

			const saveReply = await Board.findOne({ where: { id: replyNo } });

			expect(saveReply.title).toBe('testReplyTitle');
			expect(saveReply.content).toBe('testReplyContent');
			expect(saveReply.userId).toBe(DEFAULT_MEMBER.id);
			expect(saveReply.createdAt).toBeDefined();
			expect(saveReply.indent).toBe(2);
			expect(saveReply.groupNo).toBe(1);
			expect(saveReply.upperNo).toBe(`1,${replyNo}`);
		});
	})
});