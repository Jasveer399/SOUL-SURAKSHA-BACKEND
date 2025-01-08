/*
  Warnings:

  - A unique constraint covering the columns `[razorpayOrderId]` on the table `DonationRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpayPaymentId]` on the table `DonationRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DonationRecord" ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "razorpayPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DonationRecord_razorpayOrderId_key" ON "DonationRecord"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DonationRecord_razorpayPaymentId_key" ON "DonationRecord"("razorpayPaymentId");
