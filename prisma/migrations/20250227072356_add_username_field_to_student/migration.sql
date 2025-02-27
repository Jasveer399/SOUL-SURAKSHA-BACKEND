/*
  Warnings:

  - A unique constraint covering the columns `[userName]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "userName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_userName_key" ON "Student"("userName");
