-- CreateTable
CREATE TABLE "ViewBlog" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewBlog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ViewBlog" ADD CONSTRAINT "ViewBlog_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewBlog" ADD CONSTRAINT "ViewBlog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
