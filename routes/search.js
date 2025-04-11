import express from "express";
import { searchContent } from "../controllers/searchController.js";

const router = express.Router();

router.get("/", searchContent);

export default router;
