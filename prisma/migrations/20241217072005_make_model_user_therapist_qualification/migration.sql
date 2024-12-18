/*
  Warnings:

  - The primary key for the `Qualification` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Therapist` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Qualification" DROP CONSTRAINT "Qualification_therapistId_fkey";

-- AlterTable
ALTER TABLE "Qualification" DROP CONSTRAINT "Qualification_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "therapistId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Qualification_id_seq";

-- AlterTable
ALTER TABLE "Therapist" DROP CONSTRAINT "Therapist_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Therapist_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Therapist_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
