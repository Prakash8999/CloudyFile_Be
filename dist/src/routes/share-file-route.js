"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authUser_1 = require("../helper/middleware/authUser");
const fileShareCtrl_1 = require("../controllers/fileShareCtrl");
const router = express_1.default.Router();
router.post('/insert', authUser_1.authUser, fileShareCtrl_1.shareFileWithUsers);
router.get('/get-shared-files', authUser_1.authUser, fileShareCtrl_1.getSharedFiles);
router.get('/get-shared-files-url/:id', authUser_1.authUser, fileShareCtrl_1.getFileSignedUrl);
router.get('/get-collaborators/:fileId', authUser_1.authUser, fileShareCtrl_1.getCollaborators);
router.patch('/update-shared-file-data', authUser_1.authUser, fileShareCtrl_1.updateSharedFileCollaborators);
exports.default = router;
