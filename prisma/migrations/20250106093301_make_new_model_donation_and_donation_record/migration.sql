/*
  Warnings:

  - Changed the type of `totalAmount` on the `Donation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Donation" DROP COLUMN "totalAmount",
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL;
