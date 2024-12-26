/*
  Warnings:

  - You are about to drop the `Qualification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Qualification" DROP CONSTRAINT "Qualification_therapistId_fkey";

-- AlterTable
ALTER TABLE "Therapist" ADD COLUMN     "qualifications" TEXT;

-- DropTable
DROP TABLE "Qualification";
