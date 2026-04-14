import { Board, Member } from "#models/index.js"
import logger from "#config/loggerConfig.js"
import { ResponseStatus } from "#constants/responseStatus.js"
import CustomError from "#errors/customError.js"
import { getOffset } from "#utils/paginationUtils.js"
import { Op } from "sequelize"

const boardAmount = 20;

export class BoardRepository {
	static async getBoardListPageable({keyword, searchType, page = 1}) {
		const offset = getOffset(page, boardAmount);
		const searchKeyword = keyword ? `%${keyword}%` : '';
		const where = {};

		const memberInclude = {
			model: Member,
			as: 'Member',
			attributes: ['nickname']
		}

		switch (searchType) {
			case 't':
				where.title = { [Op.like]: `${searchKeyword}` };
				break;
			case 'c':
				where.content = { [Op.like]: `${searchKeyword}` };
				break;
			case 'tc':
				where[Op.or] = [
					{ title: { [Op.like]: `${searchKeyword}` } },
					{ content: { [Op.like]: `${searchKeyword}` } },
				]
				break;
			case 'u':
				where['$Member.nickname$'] = { [Op.like]: `${searchKeyword}` };
				break;
			default:
				break;
		}

		const boardList = await Board.findAndCountAll({
			attributes: ['id', 'title', 'userId', 'createdAt', 'indent'],
			where,
			include: [memberInclude],
			limit: boardAmount,
			offset,
			order: [['groupNo', 'DESC'], ['upperNo', 'ASC']],
		});

		return boardList;
	}

	static async getBoardDetail(id) {
		const board = await Board.findOne({
			attributes: ['id', 'title', 'content', 'userId', 'createdAt'],
			where: { id: id}
		});

		if(!board) {
			logger.error('Board detail data not found, boardNo: ', { id });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return board;
	}

	static async postBoard(title, content, userId, options = {}) {
		const board = await Board.create({
			title: title,
			content: content,
			userId: userId,
		}, { transaction: options.transaction });

		const id = board.id;

		// 최초 저장 이후 해당 게시글 기준으로 UpperNo, groupNo 갱신 필요.
		await Board.update({
			groupNo: id,
			upperNo: id.toString(),
		}, { where: { id }, transaction: options.transaction });

		return id;
	}

	static async getPatchDetailData(id, userId) {
		const board = await Board.findOne({
			attributes: ['id', 'title', 'content', 'userId'],
			where: { id }
		});

		if(!board) {
			logger.error('Board detail data not found, boardNo: ', { id });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		if(board.userId !== userId) {
			// 작성자가 아닌 경우
			logger.error('User is not the author of the board, boardNo: ', { id });
			throw new CustomError(ResponseStatus.FORBIDDEN);
		}

		return board;
	}

	static async patchBoard(id, title, content) {
		await Board.update({
			title: title,
			content: content,
		}, { where: { id } });
	}

	static async deleteBoard(id) {
		await Board.destroy({ where: { id } });
	}

	static async getReplyDetail(id) {
		const reply = await Board.findOne({
			attributes: ['groupNo', 'upperNo', 'indent'],
			where: { id }
		})

		if(!reply) {
			logger.error('Reply detail data not found, boardNo: ', { id });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return reply;
	}

	static async postBoardReply(title, content, groupNo, indent, upperNo, userId, options = {}) {
		const reply = await Board.create({
			title: title,
			content: content,
			groupNo: groupNo,
			indent: indent,
			upperNo: upperNo,
			userId: userId,
		}, { transaction: options.transaction });

		const replyNo = reply.id;
		const updateUpperNo = `${upperNo},${replyNo}`;

		await Board.update({
			upperNo: updateUpperNo,
		}, { where: { id: replyNo }, transaction: options.transaction });

		return replyNo;
	}
}