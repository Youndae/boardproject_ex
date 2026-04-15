import { Board, Member } from "#models/index.js"
import logger from "#config/loggerConfig.js"
import { ResponseStatus } from "#constants/responseStatus.js"
import CustomError from "#errors/customError.js"
import { getOffset, toPage } from "#utils/paginationUtils.js"
import {Op, Sequelize} from "sequelize"

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
			attributes: [
				'id',
				'title',
				[Sequelize.col('Member.nickname'), 'writer'],
				'createdAt',
				'indent'
			],
			where,
			include: [memberInclude],
			limit: boardAmount,
			offset,
			order: [['groupNo', 'DESC'], ['upperNo', 'ASC']],
		});

		return toPage(boardList, page, boardAmount);
	}

	static async getBoardDetail(id) {
		console.log('getBoardDetail id : ', id);
		const board = await Board.findOne({
			attributes: [
				'title',
				[Sequelize.col('Member.nickname'), 'writer'],
				[Sequelize.col('Member.user_id'), 'writerId'],
				'content',
				'createdAt'
			],
			include: [
				{
					model: Member,
					as: 'Member',
					attributes: []
				}
			],
			where: { id: id},
			raw: true
		});

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

	static async getPatchDetailData(id) {
		const board = await Board.findOne({
			attributes: [
				'id',
				'title',
				'content',
				'userId',
			],
			include: [
				{
					model: Member,
					as: 'Member'
				}
			],
			where: { id },
			raw: true,
		});

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
		return await Board.findOne({
			where: { id },
			raw: true,
		});
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

	static async getBoardWriter(id){
		return await Board.findOne({
			attributes: ['userId'],
			where: {id}
		});
	}
}