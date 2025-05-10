import  express  from "express";
import { uploadFileUrl } from "../controllers/FileAttributesCtrl";
import { authUser } from "../helper/middleware/authUser";

const router = express.Router()


router.post('/upload',authUser, uploadFileUrl)

export default router;