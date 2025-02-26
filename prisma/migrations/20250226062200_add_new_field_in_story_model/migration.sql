-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "isComplete" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "StoryChunk" (
    "storyId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "receivedChunks" INTEGER NOT NULL,
    "totalChunks" INTEGER NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryChunk_pkey" PRIMARY KEY ("storyId")
);

-- AddForeignKey
ALTER TABLE "StoryChunk" ADD CONSTRAINT "StoryChunk_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
