/*
  Warnings:

  - You are about to drop the column `userName` on the `Student` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Student_userName_key";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "userName";
