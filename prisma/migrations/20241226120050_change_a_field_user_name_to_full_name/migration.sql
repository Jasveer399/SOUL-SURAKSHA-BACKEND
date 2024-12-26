/*
  Warnings:

  - You are about to drop the column `userName` on the `Parent` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `Student` table. All the data in the column will be lost.
  - Added the required column `fullName` to the `Parent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "userName",
ADD COLUMN     "fullName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "userName",
ADD COLUMN     "fullName" TEXT NOT NULL;
