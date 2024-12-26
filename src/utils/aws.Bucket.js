import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});


const BUCKET_NAME = "soul-suraksha";
const FOLDER_PATH = "Uploads/Story-Images";

const generateUploadUrl = async (fileType) => {
  const fileName = `image-${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}.${fileType.split("/")[1]}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${FOLDER_PATH}/${fileName}`,
    ContentType: fileType,
  });

  const presignedUrl = await getSignedUrl(s3Client, command);
  const objectUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${FOLDER_PATH}/${fileName}`;

  return {
    presignedUrl,
    objectUrl,
    fileName,
  };
};

async function handleSingleUpload(req, res) {
  try {
    const { fileType } = req.body; // expect 'image/jpeg' or 'image/png' etc.
    const uploadData = await generateUploadUrl(fileType);
    res.status(200).json(uploadData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export { handleSingleUpload };
