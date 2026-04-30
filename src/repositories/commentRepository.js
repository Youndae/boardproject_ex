import { Comment, Member } from "#models/index.js";
import {getOffset, toPage} from "#utils/paginationUtils.js";
import {Sequelize} from "sequelize";

const commentAmount = 20;

export class CommentRepository {

	static async getCommentListPageable({ boardId, imageId, page = 1 }) {
		const offset = getOffset(page, commentAmount);
		const where = boardId ? { boardId: boardId } : { imageId: imageId };

		const commentList = await Comment.findAndCountAll({
			attributes: [
				'id',
				[Sequelize.col('Member.user_id'), 'writerId'],
				[Sequelize.col('Member.nickname'), 'writer'],
				'createdAt',
				'content',
				'indent',
				'deletedAt'
			],
			include: [
				{
					model: Member,
					as: 'Member',
					attributes: []
				}
			],
			where: where,
			limit: commentAmount,
			offset: offset,
			order: [ ['groupNo', 'DESC'], ['upperNo', 'ASC'] ],
			paranoid: false,
			raw: true
		});

		return toPage(commentList, page, commentAmount);
	}

	static async postComment(boardId, imageId, userId, content, options = {}) {
		const comment = await Comment.create({
			boardId: boardId,
			imageId: imageId,
			userId: userId,
			content: content,
		}, { transaction: options.transaction });

		await Comment.update({
			groupNo: comment.id,
			upperNo: `${comment.id}`,
		}, { where: { id: comment.id }, transaction: options.transaction });

		return comment;
	}

	static async deleteComment(id) {
		await Comment.destroy({ where: { id } });
	}

	static async postReplyComment(
		boardId,
		imageId,
		content,
		groupNo,
		indent,
		upperNo,
		userId,
		options = {}
	) {

		const comment = await Comment.create({
			boardId: boardId,
			imageId: imageId,
			userId: userId,
			content: content,
			groupNo: groupNo,
			indent: indent,
			upperNo: upperNo,
		}, { transaction: options.transaction });

		await Comment.update({
			upperNo: `${upperNo},${comment.id}`,
		}, { where: { id: comment.id }, transaction: options.transaction });

		return comment;
	}

	static async findById(id) {
		return await Comment.findOne({
			where: { id },
			raw: true
		})
	}

	static async checkCommentWriter(id) {
		return await Comment.findOne({
			attributes: ['userId'],
			where: { id },
			raw: true
		});
	}
}