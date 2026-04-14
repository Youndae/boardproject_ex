import {ResponseStatus} from "#constants/responseStatus.js";

class ApiResponse {

    /**
     *
     * @param {number} code - HTTP Status Code
     * @param {string} message - Response Message
     * @param {any} content - Response Data (Default Empty Object}
     */
    constructor(code, message, content = {}) {
        this.code = code;
        this.message = message;
        this.content = content;
        this.timestamp = new Date().toISOString();

        Object.freeze(this);
    }

    static success(content = {}, message = ResponseStatus.OK.MESSAGE) {
        return new ApiResponse(ResponseStatus.OK.CODE, message, content);
    }

    static successWithMsg(message) {
        return new ApiResponse(ResponseStatus.OK.CODE, message, {});
    }

    static created(content = {}, message = ResponseStatus.CREATED.MESSAGE) {
        return new ApiResponse(ResponseStatus.CREATED.CODE, message, content);
    }
}

export default ApiResponse;