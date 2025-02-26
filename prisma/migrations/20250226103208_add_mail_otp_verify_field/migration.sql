-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "isMailOtpVerify" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Therapist" ADD COLUMN     "isMailOtpVerify" BOOLEAN NOT NULL DEFAULT false;
