// import repositories

import logger from "#config/loggerConfig.js"
import CustomError from "#errors/customError.js"
import { ResponseStatus } from "#constants/responseStatus.js"


export async function getBoardListService({keyword, searchType, pageNum = 1}) {}


export async function getBoardDetailService(boardNo) {}


export async function postBoardService(userId, {boardTitle, boardContent}) {}


export async function patchBoardDetailDataService(userId, boardNo) {}


export async function patchBoardService(userId, boardNo, {boardTitle, boardContent}) {}


export async function deleteBoardService(userId, boardNo) {}


export async function getReplyDetailService(boardNo) {}


export async function postBoardReplyService(userId, {boardTitle, boardContent, boardGroupNo, boardIndent, boardUpperNo}) {}