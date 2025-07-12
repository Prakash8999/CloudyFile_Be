"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validation = exports.error = exports.success = void 0;
// ✅ Success Response
const success = (message, results, statusCode, meta) => {
    return {
        status: "success",
        code: statusCode,
        error: false,
        meta,
        data: results || [],
        message,
        assetsBaseUrl: process.env.r2_base_url,
    };
};
exports.success = success;
// ✅ Error Response
const error = (message, statusCode, err) => {
    const codes = [200, 201, 400, 401, 404, 403, 409, 422, 500];
    const findCode = codes.includes(statusCode) ? statusCode : 500;
    return {
        status: "failed",
        code: findCode,
        error: true,
        data: err || [],
        message,
    };
};
exports.error = error;
// ✅ Validation Response
const validation = (errors) => {
    return {
        code: 422,
        error: true,
        data: errors || [],
        message: "Validation errors",
    };
};
exports.validation = validation;
