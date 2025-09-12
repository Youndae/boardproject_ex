import { Board } from "#models/index.js"
import logger from "#config/loggerConfig.js"
import { ResponseStatus } from "#constants/responseStatus.js"
import CustomError from "#errors/customError.js"
import { getOffset } from "#utils/paginationUtils.js"
import { Op } from "sequelize"

const boardAmount = 20;

export class BoardRepository {
	static async getBoardListPageable({keyword, searchType, pageNum = 1}) {
		const offset = getOffset(pageNum, boardAmount);
		const searchKeyword = keyword ? `%${keyword}%` : '';
		const where = {};

		switch (searchType) {
			case 't':
				where.boardTitle = { [Op.like]: `${searchKeyword}` };
				break;
			case 'c':
				where.boardContent = { [Op.like]: `${searchKeyword}` };
				break;
			case 'tc':
				where[Op.or] = [
					{ boardTitle: { [Op.like]: `${searchKeyword}` } },
					{ boardContent: { [Op.like]: `${searchKeyword}` } },
				]
				break;
			case 'u':
				where.userId = { [Op.like]: `${searchKeyword}` };
				break;
			default:
				break;
		}

		const boardList = await Board.findAndCountAll({
			attributes: ['boardNo', 'boardTitle', 'userId', 'boardDate', 'boardIndent'],
			where,
			limit: boardAmount,
			offset,
			order: [['boardGroupNo', 'DESC'], ['boardUpperNo', 'ASC']],
		});

		return boardList;
	}

	static async getBoardDetail(boardNo) {
		const board = await Board.findOne({
			attributes: ['boardNo', 'boardTitle', 'boardContent', 'userId', 'boardDate'],
			where: { boardNo: boardNo}
		});

		if(!board) {
			logger.error('Board detail data not found, boardNo: ', { boardNo });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return board;
	}

	static async postBoard(boardTitle, boardContent, userId, options = {}) {
		const board = await Board.create({
			boardTitle: boardTitle,
			boardContent: boardContent,
			userId: userId,
		}, { transaction: options.transaction });

		const boardNo = board.boardNo;

		// 최초 저장 이후 해당 게시글 기준으로 UpperNo, groupNo 갱신 필요.
		await Board.update({
			boardGroupNo: boardNo,
			boardUpperNo: boardNo.toString(),
		}, { where: { boardNo: boardNo }, transaction: options.transaction });

		return boardNo;
	}

	static async getPatchDetailData(boardNo, userId) {
		const board = await Board.findOne({
			attributes: ['boardNo', 'boardTitle', 'boardContent', 'userId'],
			where: { boardNo: boardNo }
		});

		if(!board) {
			logger.error('Board detail data not found, boardNo: ', { boardNo });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		if(board.userId !== userId) {
			// 작성자가 아닌 경우
			logger.error('User is not the author of the board, boardNo: ', { boardNo });
			throw new CustomError(ResponseStatus.FORBIDDEN);
		}

		return board;
	}

	static async patchBoard(boardNo, boardTitle, boardContent) {
		await Board.update({
			boardTitle: boardTitle,
			boardContent: boardContent,
		}, { where: { boardNo: boardNo } });
	}

	static async deleteBoard(boardNo) {
		await Board.destroy({ where: { boardNo: boardNo } });
	}

	static async getReplyDetail(boardNo) {
		const reply = await Board.findOne({
			attributes: ['boardGroupNo', 'boardUpperNo', 'boardIndent'],
			where: { boardNo: boardNo }
		})

		if(!reply) {
			logger.error('Reply detail data not found, boardNo: ', { boardNo });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return reply;
	}

	static async postBoardReply(boardTitle, boardContent, boardGroupNo, boardIndent, boardUpperNo, userId, options = {}) {
		const reply = await Board.create({
			boardTitle: boardTitle,
			boardContent: boardContent,
			boardGroupNo: boardGroupNo,
			boardIndent: boardIndent,
			boardUpperNo: boardUpperNo,
			userId: userId,
		}, { transaction: options.transaction });

		const replyNo = reply.boardNo;
		const updateUpperNo = `${boardUpperNo},${replyNo}`;

		await Board.update({
			boardUpperNo: updateUpperNo,
		}, { where: { boardNo: replyNo }, transaction: options.transaction });

		return replyNo;
	}
}