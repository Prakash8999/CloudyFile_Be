"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const storageStatsCtrl_1 = require("../controllers/storageStatsCtrl");
const authUser_1 = require("../helper/middleware/authUser");
const router = (0, express_1.default)();
router.get("/", authUser_1.authUser, storageStatsCtrl_1.getFilesStats);
exports.default = router;
