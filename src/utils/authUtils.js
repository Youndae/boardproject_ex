import CustomError from "#errors/customError.js";
import {ResponseStatus} from "#constants/responseStatus.js";
import logger from "#config/loggerConfig.js";

const ROLE_PRIORITY = {
    'ROLE_MEMBER': 0,
    'ROLE_ADMIN': 1,
};

export const getMaxRole = (authorities = []) => {
    if(!authorities.length){
        logger.error('authUtils.getMaxRole error. authorities is []');
        throw new CustomError(ResponseStatus.INTERNAL_SERVER_ERROR);
    }

    return authorities.reduce((max, curr) => {
        const currScore = ROLE_PRIORITY[curr] ?? -1;
        const maxScore = ROLE_PRIORITY[max] ?? -1;

        return currScore > maxScore ? curr : max;
    })
}