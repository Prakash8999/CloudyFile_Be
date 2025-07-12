"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const UserCtrl_1 = require("../controllers/UserCtrl");
const authUser_1 = require("../helper/middleware/authUser");
const router = express_1.default.Router();
router.post('/google-auth', UserCtrl_1.googleAuth);
router.post('/sign-up', UserCtrl_1.insertUser);
router.post('/login', UserCtrl_1.loginUser);
router.post('/verify', UserCtrl_1.verifyUser);
// protected routes
router.get('/read', authUser_1.authUser, UserCtrl_1.readUser);
router.get('/regen', authUser_1.authUser, UserCtrl_1.tokenRegen);
router.post('/logout', authUser_1.authUser, UserCtrl_1.logoutUser);
router.get('/read-clbrtr', authUser_1.authUser, UserCtrl_1.userExist);
exports.default = router;
