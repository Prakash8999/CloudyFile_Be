"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeToYMD = sanitizeToYMD;
function sanitizeToYMD(dateInput) {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
        throw new Error("Invalid date input");
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
