"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.successHandler = void 0;
const responseStructure_1 = require("./responseStructure");
const successHandler = (res, message, results, statusCode, meta) => {
    return res.status(statusCode).json((0, responseStructure_1.success)(message, results, statusCode, meta));
};
exports.successHandler = successHandler;
const errorHandler = (res, message, statusCode, err) => {
    return res.status(statusCode).json((0, responseStructure_1.error)(message, statusCode, err));
};
exports.errorHandler = errorHandler;
