import {
	getBoardListPageable,
	getBoardDetail,
	postBoard,
	getPatchDetailData,
	patchBoard,
	deleteBoard,
	getReplyDetail,
	postBoardReply
} from '#repositories/boardRepository.js';
import logger from "#config/loggerConfig.js"
import CustomError from "#errors/customError.js"
import { ResponseStatus } from "#constants/responseStatus.js"
import { sequelize } from "#models/index.js"


export async function getBoardListService({keyword, searchType, pageNum = 1}) {}


export async function getBoardDetailService(boardNo) {}


export async function postBoardService(userId, {boardTitle, boardContent}) {}


export async function patchBoardDetailDataService(userId, boardNo) {}


export async function patchBoardService(userId, boardNo, {boardTitle, boardContent}) {}


export async function deleteBoardService(userId, boardNo) {}


export async function getReplyDetailService(boardNo) {}

// sequelize transaction 필요.
// 최초 저장 이후 해당 게시글 기준으로 UpperNo 갱신 필요.
export async function postBoardReplyService(userId, {boardTitle, boardContent, boardGroupNo, boardIndent, boardUpperNo}) {}

// 기존 데이터 조회 후 작성자 체크
async function checkWriter(userId, boardNo) {}