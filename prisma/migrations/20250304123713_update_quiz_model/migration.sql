/*
  Warnings:

  - You are about to drop the column `answer` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `option1` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `option2` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `option3` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `option4` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `question` on the `Quiz` table. All the data in the column will be lost.
  - Added the required column `description` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Quiz` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Blog" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "answer",
DROP COLUMN "option1",
DROP COLUMN "option2",
DROP COLUMN "option3",
DROP COLUMN "option4",
DROP COLUMN "question",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "totalQuestions" INTEGER DEFAULT 0,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "questionId" TEXT;

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "option1" TEXT NOT NULL,
    "option2" TEXT NOT NULL,
    "option3" TEXT NOT NULL,
    "option4" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quizId" TEXT NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizAttempt_questionId_idx" ON "QuizAttempt"("questionId");

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
