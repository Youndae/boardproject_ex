import ApiResponse from "#dto/ApiResponse.js";


export const responseHandler = (req, res, next) => {
    res.success = (content, message) => {
        const response = ApiResponse.success(content, message);
        return res.status(response.code).json(response);
    };

    res.successWithMsg = (message) => {
        const response = ApiResponse.successWithMsg(message);
        return res.status(response.code).json(response);
    }

    res.created = (content, message) => {
        const response = ApiResponse.created(content, message);
        return res.status(response.code).json(response);
    };

    next();
}
