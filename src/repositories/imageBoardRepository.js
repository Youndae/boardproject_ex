import { ImageBoard, ImageData, Member } from "#models/index.js";
import { getOffset } from "#utils/paginationUtils.js";
import { sequelize } from "#models/index.js";
import {Sequelize} from "sequelize";
import { Op } from "sequelize";
import CustomError from "#errors/customError.js";
import { ResponseStatus } from "#constants/responseStatus.js";
import logger from "#config/loggerConfig.js";
import { ImageConstants } from "#constants/imageConstants.js";

const imageBoardAmount = 15;

export class ImageBoardRepository {

	// query check
	static async getImageBoardListPageable({keyword, searchType, page = 1}) {
		const offset = getOffset(page, imageBoardAmount);
		const searchKeyword = keyword ? `%${keyword}%` : '';
		const where = {};
		const include = [
			{
				model: ImageData,
				as: 'imageDatas',
				attributes: [],
				required: true,
			}
		];

		if(searchType && keyword) {
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
					];
					break;
				case 'u':
					include.push({
						model: Member,
						as: 'Member',
						attributes: [],
						required: true
					});
					where['$Member.nickname$'] = { [Op.like]: `${searchKeyword}` };
					break;
			}
		}

		const { count, rows } = await ImageBoard.findAndCountAll({
			attributes: [
				'id',
				'title',
				[Sequelize.fn('MIN', Sequelize.col('imageDatas.image_name')), 'imageName']
			],
			include,
			where,
			group: ['ImageBoard.id'],
			order: [['id', 'DESC']],
			limit: imageBoardAmount,
			offset,
			distinct: true,
			subQuery: false,
			raw: true,
		});

		const totalElements = Array.isArray(count) ? count.length : count;

		return { content: rows, totalElements };
	}

	static async getImageBoardDetail(id) {
		const boardDetail = await ImageBoard.findOne({
			attributes: ['id', 'title', 'content', 'userId', 'createdAt'],
			where: { id },
			include: [{
				model: ImageData,
				as: 'imageDatas',
				attributes: ['imageName', 'originName', 'imageStep'],
				where: { imageId: id },
				order: [['imageStep', 'ASC']]
			}]
		});

		if(!boardDetail) {
			logger.error('Image board detail data not found, imageNo: ', { id });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return boardDetail;
	}

	static async postImageBoard(userId, title, content, files, options = { }) {
		const imageBoard = await ImageBoard.create({
			userId: userId,
			title: title,
			content: content,
		}, { transaction: options.transaction });

		const imageNo = imageBoard.id;
		let step = 1;

		await ImageData.bulkCreate(files.map(file => ({
			imageName: `${ImageConstants.BOARD_PREFIX}${file.filename}`,
			originName: file.originalname,
			imageStep: step++,
			imageId: imageNo,
		})), { transaction: options.transaction });

		return imageNo;
	}

	static async getImageBoardPatchDetail(id) {
		const imageBoard = await ImageBoard.findOne({
			attributes: ['id', 'title', 'content'],
			where: { id },
			include: [{
				model: ImageData,
				as: 'imageDatas',
				attributes: ['imageName'],
				where: { imageId: id },
				order: [['imageStep', 'ASC']]
			}]
		});

		if(!imageBoard) {
			logger.error('Image board patch detail data not found, imageNo: ', { id });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return imageBoard;
	}

	static async patchImageBoard(id, title, content, files, deleteFiles, options = {}) {
		let maxImageStep = await ImageData.max('imageStep', { where: { imageId: id } }) + 1;

		await ImageBoard.update({
			title: title,
			content: content,
		}, { where: { id }, transaction: options.transaction });

		if(deleteFiles) 
			await ImageData.destroy(
				{
					where: { imageId: id, imageName: { [Op.in]: deleteFiles } },
					transaction: options.transaction
				}
			);

		if(files) {
			await ImageData.bulkCreate(files.map(file => ({
				imageName: `${ImageConstants.BOARD_PREFIX}${file.filename}`,
				originName: file.originalname,
				imageStep: maxImageStep++,
				imageId: id,
			})), { transaction: options.transaction });
		}

		return id;
	}

	static async deleteImageBoard(id) {
		await ImageBoard.destroy({ where: { id } });
	}

	static async getImageBoardWriter(id) {
		const imageBoard = await ImageBoard.findOne({
			attributes: ['userId'],
			where: { id },
		});

		if(!imageBoard) {
			logger.error('Image board writer data not found, imageNo: ', { id });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return imageBoard.userId;
	}

	static async getImageBoardDeleteFiles(imageId) {
		const imageData = await ImageData.findAll({
			attributes: ['imageName'],
			where: { imageId },
		});

		return imageData;
	}
}