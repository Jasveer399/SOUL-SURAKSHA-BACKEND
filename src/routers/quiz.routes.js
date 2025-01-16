import { Router } from "express";
import {
  createQuiz,
  editQuiz,
  getQuizzes,
  submitQuizAttempt,
  toogleisActive,
} from "../controllers/quiz.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/createQuiz", createQuiz);
router.get("/getQuizzes", getQuizzes);
router.put("/editQuiz/:id", editQuiz);
router.put("/toogleisActive/:id/:isActive", toogleisActive);
router.post("/attemptQuiz", verifyJWT(["student"]), submitQuizAttempt);
export { router as quizRoutes };
