-- DropForeignKey
ALTER TABLE "ViewBlog" DROP CONSTRAINT "ViewBlog_studentId_fkey";

-- AlterTable
ALTER TABLE "ViewBlog" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "therapistId" TEXT,
ALTER COLUMN "studentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ViewBlog" ADD CONSTRAINT "ViewBlog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewBlog" ADD CONSTRAINT "ViewBlog_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewBlog" ADD CONSTRAINT "ViewBlog_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "Therapist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
