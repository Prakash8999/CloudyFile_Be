import express from "express";
import { getFilesStats } from "../controllers/storageStatsCtrl";
import { authUser } from "../helper/middleware/authUser";

const router = express()

router.get("/",authUser, getFilesStats)

export default router;