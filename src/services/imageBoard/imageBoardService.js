//TODO: import repositories

import logger from "#config/loggerConfig.js";
import CustomError from "#errors/customError.js";
import { ResponseStatus } from "#constants/responseStatus.js";
import { sequelize } from "#models/index.js";
import { deleteImageFile } from "#utils/fileUtils.js";

export async function getImageBoardListService({keyword, searchType, pageNum = 1}) {}

export async function getImageBoardDetailService(imageNo) {}

export async function postImageBoardService(userId, {imageTitle, imageContent}, {filename, originalname}) {}

export async function getImageBoardPatchDetailService(imageNo) {}

export async function patchImageBoardService(userId, imageNo, {imageTitle, imageContent}, {filename, originalname}, deleteFiles) {}

export async function deleteImageBoardService(imageNo) {}

export async function getImageBoardDisplayService(imageName) {}