"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContentType = void 0;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp', 'image/tiff', 'video/mp4', 'video/mpeg', 'video/ogg', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-wav', 'audio/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
];
const validateContentType = (type, name) => {
    if (!allowedTypes.includes(type)) {
        return {
            error: true,
            message: `Invalid file type: ${type}`
        };
    }
    const invalidChars = /[\/\\?%*:|"<>]/;
    if (invalidChars.test(name)) {
        return {
            error: true,
            message: `Invalid file name: Contains unsupported special characters`
        };
    }
    if (name.length > 100) {
        return {
            error: true,
            message: `Invalid file name: File name should not be more than 100 characters`
        };
    }
    return { error: false, message: '' };
};
exports.validateContentType = validateContentType;
