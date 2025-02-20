-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "isOtpVerify" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp" INTEGER;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "isOtpVerify" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp" INTEGER;

-- AlterTable
ALTER TABLE "Therapist" ADD COLUMN     "isOtpVerify" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp" INTEGER;
