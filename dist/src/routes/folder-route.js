"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authUser_1 = require("../helper/middleware/authUser");
const folderCtrl_1 = require("../controllers/folderCtrl");
const router = express_1.default.Router();
router.post('/insert', authUser_1.authUser, folderCtrl_1.insertFolder);
router.get('/read', authUser_1.authUser, folderCtrl_1.readFolders);
router.get('/read/:id', authUser_1.authUser, folderCtrl_1.readOwnFolder);
router.patch('/update', authUser_1.authUser, folderCtrl_1.updateFolder);
// router.get('/files', authUser, updateFolder)
exports.default = router;
