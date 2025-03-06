-- DropForeignKey
ALTER TABLE "QuizQuestion" DROP CONSTRAINT "QuizQuestion_quizId_fkey";

-- AlterTable
ALTER TABLE "Quiz" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
