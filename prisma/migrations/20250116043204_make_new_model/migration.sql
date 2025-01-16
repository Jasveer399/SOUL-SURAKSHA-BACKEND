-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "option1" TEXT NOT NULL,
    "option2" TEXT NOT NULL,
    "option3" TEXT NOT NULL,
    "option4" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);
