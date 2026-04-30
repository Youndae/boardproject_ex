import { ImageBoard, ImageData, Member } from "#models/index.js";
import {getOffset, toPage} from "#utils/paginationUtils.js";
import {Sequelize} from "sequelize";
import { Op } from "sequelize";

const imageBoardAmount = 15;

export class ImageBoardRepository {

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

		const boardList = await ImageBoard.findAndCountAll({
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

		return toPage(boardList, page, imageBoardAmount);
	}

	static async getImageBoardDetail(id) {
		const boardDetail = await ImageBoard.findOne({
			attributes: [
				'title',
				'content',
				[Sequelize.col('Member.nickname'), 'writer'],
				[Sequelize.col('Member.user_id'), 'writerId'],
				'createdAt'
			],
			where: { id },
			include: [
				{
					model: ImageData,
					as: 'imageDatas',
					attributes: ['imageName'],
				},
				{
					model: Member,
					as: 'Member',
					attributes: []
				}
			],
			order: [[ { model: ImageData, as: 'imageDatas' }, 'imageStep', 'ASC']]
		});

		if(!boardDetail) return null;

		const rawData = boardDetail.get({ plain: true });

		return {
			title: rawData.title,
			content: rawData.content,
			writer: rawData.writer,
			writerId: rawData.writerId,
			createdAt: rawData.createdAt.toISOString().split('T')[0],
			imageDataList: rawData.imageDatas.map(img => img.imageName)
		};
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
			imageName: `${file.filename}`,
			originName: file.originalname,
			imageStep: step++,
			imageId: imageNo,
		})), { transaction: options.transaction });

		return imageNo;
	}

	static async getImageBoardPatchDetail(id) {
		const imageBoard = await ImageBoard.findOne({
			attributes: ['title', 'content'],
			where: { id },
			include: [{
				model: ImageData,
				as: 'imageDatas',
				attributes: ['imageName', 'originName', 'imageStep'],
			}],
			order: [[ { model: ImageData, as: 'imageDatas' }, 'imageStep', 'ASC']]
		});

		if(!imageBoard) return null;

		const rawData = imageBoard.get({ plain: true });

		return {
			title: rawData.title,
			content: rawData.content,
			imageList: rawData.imageDatas.map(({ imageName, originName, imageStep }) => ({
				imageName,
				originName,
				imageStep
			}))
		}
	}

	static async patchImageBoard(id, title, content, files, deleteFiles, options = {}) {
		let maxImageStep = await ImageData.max('imageStep', { where: { imageId: id } }) + 1;

		await ImageBoard.update({
			title: title,
			content: content,
		}, { where: { id }, transaction: options.transaction });

		if(deleteFiles) {
			const deleteList = Array.isArray(deleteFiles) ? deleteFiles : [deleteFiles];
			await ImageData.destroy(
				{
					where: {imageId: id, imageName: {[Op.in]: deleteList}},
					transaction: options.transaction
				}
			);
		}


		if(files) {
			const fileList = Array.isArray(files) ? files : [files];
			const imageDataList = fileList.map((file) => ({
				imageName: `${file.filename}`,
				originName: file.originalname,
				imageStep: maxImageStep++,
				imageId: id,
			}));

			await ImageData.bulkCreate(imageDataList, { transaction: options.transaction })
		}

		return id;
	}

	static async deleteImageBoard(id, options = {}) {
		await ImageBoard.destroy({ where: { id }, transaction: options.transaction });
	}

	static async getImageBoardWriter(id) {
		const imageBoard = await ImageBoard.findOne({
			attributes: ['userId'],
			where: { id }
		});

		return imageBoard ? imageBoard.userId : null;
	}

	static async getImageBoardDeleteFiles(imageId, options = {}) {
		const imageData = await ImageData.findAll({
			attributes: ['imageName'],
			where: { imageId },
			transaction: options.transaction,
			raw: true,
		});

		return imageData.map(data => data.imageName);
	}
}