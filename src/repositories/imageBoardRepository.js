import { ImageBoard } from "#models/index.js";
import { getOffset } from "#utils/paginationUtils.js";
import { sequelize } from "#models/index.js";
import { Sequelize } from "sequelize";

const imageBoardAmount = 15;

export class ImageBoardRepository {
	static async getImageBoardListPageable({keyword, searchType, pageNum = 1}) {
		const offset = getOffset(pageNum, imageBoardAmount);
		const searchKeyword = keyword ? `%${keyword}%` : '';
		const replacements = { offset, limit: imageBoardAmount };
		let whereClause = '';
		const countWhere = {};

		switch (searchType) {
			case 't':
				whereClause = 'WHERE ib.imageTitle LIKE :keyword';
				countWhere.imageTitle = { [Op.like]: `${searchKeyword}` };
				break;
			case 'c':
				whereClause = 'WHERE ib.imageContent LIKE :keyword';
				countWhere.imageContent = { [Op.like]: `${searchKeyword}` };
				break;
			case 'tc':
				whereClause = 'WHERE (ib.imageTitle LIKE :keyword OR ib.imageContent LIKE :keyword)';
				countWhere[Op.or] = [
					{ imageTitle: { [Op.like]: `${searchKeyword}` } },
					{ imageContent: { [Op.like]: `${searchKeyword}` } },
				];
				break;
			case 'u':
				whereClause = 'WHERE ib.userId LIKE :keyword';
				countWhere.userId = { [Op.like]: `${searchKeyword}` };
				break;
			default:
				break;
		}

		if(whereClause !== '')
			replacements.keyword = searchKeyword;

		const query = `
			WITH image_datas AS (
				SELECT 
					imageNo, 
					imageName,
					ROW_NUMBER() OVER (PARTITION BY imageNo ORDER BY imageStep ASC) AS rn
				FROM imageData
			)
			SELECT
				ib.imageNo AS imageNo,
				ib.imageTitle AS imageTitle,
				ib.userId AS userId,
				ib.imageDate AS imageDate,
				id.imageName AS imageName
			FROM imageBoard ib
			LEFT JOIN image_datas id
				ON ib.imageNo = id.imageNo AND id.rn = 1
			${whereClause}
			ORDER BY ib.imageNo DESC
			LIMIT :limit
			OFFSET :offset
		`;

		const result = await sequelize.query(query, {
			replacements,
			type: Sequelize.QueryTypes.SELECT,
		});

		const totalElements = await ImageBoard.count({
			where: countWhere,
		});

		return { content: result, totalElements };
	}

	static async getImageBoardDetail(imageNo) {
		const boardDetail = await ImageBoard.findOne({
			attributes: ['imageNo', 'imageTitle', 'imageContent', 'userId', 'imageDate'],
			where: { imageNo: imageNo },
			include: [{
				model: ImageData,
				as: 'imageDatas',
				attributes: ['imageName', 'oldName', 'imageStep'],
				where: { imageNo: imageNo },
				order: [['imageStep', 'ASC']]
			}]
		});

		if(!boardDetail) {
			logger.error('Image board detail data not found, imageNo: ', { imageNo });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return boardDetail;
	}

	static async postImageBoard(userId, imageTitle, imageContent, files, options = { }) {
		const imageBoard = await ImageBoard.create({
			userId: userId,
			imageTitle: imageTitle,
			imageContent: imageContent,
		}, { transaction: options.transaction });

		const imageNo = imageBoard.imageNo;
		let step = 1;

		await ImageData.bulkCreate(files.map(file => ({
			imageName: file.filename,
			oldName: file.originalname,
			imageStep: step++,
			imageNo: imageNo,
		})), { transaction: options.transaction });

		return imageNo;
	}

	static async getImageBoardPatchDetail(imageNo) {
		const imageBoard = await ImageBoard.findOne({
			attributes: ['imageNo', 'imageTitle', 'imageContent', 'imageDate'],
			where: { imageNo: imageNo },
			include: [{
				model: ImageData,
				as: 'imageDatas',
				attributes: ['imageName'],
				where: { imageNo: imageNo },
				order: [['imageStep', 'ASC']]
			}]
		});

		if(!imageBoard) {
			logger.error('Image board patch detail data not found, imageNo: ', { imageNo });
			throw new CustomError(ResponseStatus.NOT_FOUND);
		}

		return imageBoard;
	}

	static async patchImageBoard(imageNo, imageTitle, imageContent, files, deleteFiles, options = {}) {
		let maxImageStep = await ImageData.max('imageStep', { where: { imageNo: imageNo } });

		await ImageBoard.update({
			imageTitle: imageTitle,
			imageContent: imageContent,
		}, { where: { imageNo: imageNo }, transaction: options.transaction });

		await ImageData.destroy({ where: { imageNo: imageNo, imageName: { [Op.in]: deleteFiles } }, transaction: options.transaction });

		await ImageData.bulkCreate(files.map(file => ({
			imageName: file.filename,
			oldName: file.originalname,
			imageStep: maxImageStep++,
			imageNo: imageNo,
		})), { transaction: options.transaction });

		return imageNo;
	}

	static async deleteImageBoard(imageNo) {
		await ImageBoard.destroy({ where: { imageNo: imageNo } });
	}
}