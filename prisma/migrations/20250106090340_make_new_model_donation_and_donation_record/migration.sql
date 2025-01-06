-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organizedBy" TEXT NOT NULL,
    "timePeriod" TIMESTAMP(3) NOT NULL,
    "isDonationActive" BOOLEAN NOT NULL DEFAULT false,
    "desc" TEXT NOT NULL,
    "imgUrl" TEXT,
    "receivedAmount" DOUBLE PRECISION DEFAULT 0,
    "totalAmount" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationRecord" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "donationId" TEXT NOT NULL,
    "parentId" TEXT,
    "therapistId" TEXT,

    CONSTRAINT "DonationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DonationRecord_donationId_idx" ON "DonationRecord"("donationId");

-- CreateIndex
CREATE INDEX "DonationRecord_therapistId_idx" ON "DonationRecord"("therapistId");

-- AddForeignKey
ALTER TABLE "DonationRecord" ADD CONSTRAINT "DonationRecord_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationRecord" ADD CONSTRAINT "DonationRecord_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationRecord" ADD CONSTRAINT "DonationRecord_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
