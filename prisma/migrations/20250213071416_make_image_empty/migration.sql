/*
  Warnings:

  - Made the column `image` on table `Story` required. This step will fail if there are existing NULL values in that column.
  - Made the column `audio` on table `Story` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Story" ALTER COLUMN "image" SET NOT NULL,
ALTER COLUMN "image" SET DEFAULT '',
ALTER COLUMN "audio" SET NOT NULL,
ALTER COLUMN "audio" SET DEFAULT '';
