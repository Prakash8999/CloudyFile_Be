import { GetObjectCommand, S3Client, PutObjectCommand, ListObjectsV2Command, DeleteBucketCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from 'dotenv'
import { UploadFiles } from "../interfaces/fileInterfaces";
config()


// console.log( "Starting...", process.env.Region ,process.env.AccessKeyId, process.env.SecretAccessKey  );


const s3Client = new S3Client({
	region: process.env.Region,
	credentials: {
		accessKeyId: process.env.AccessKeyId!,
		secretAccessKey: process.env.SecretAccessKey!,
	}
});


export const putObject = async (fileData: UploadFiles) => {
	try {
		const { fileType, fileName, contentType, userId, uuid } = fileData;
		console.log("file data ", fileType)
		const command = new PutObjectCommand({
			Bucket: process.env.BucketName!,
			Key: `uploads/users/${userId}/${uuid + "_" + fileName}`,
			ContentType: contentType,
		})
		const url = await getSignedUrl(s3Client, command)
		// return {
		// 	success:true,
		// 	signedUrl: url
		// }
		console.log("new url ", url);
		// return url
		return { error: false, signedUrl: url , message: "File url generated successfully" }
	} catch (error: any) {
		console.log("error ", error)
  return {
	error: true,
	signedUrl: null,
	message: error?.message,
  }
		// throw error

	}
}


// async function init() {
// 	const file: UploadFiles = {
// 		fileName: "example.jpg",
// 		contentType: "image/jpeg",
// 		fileType: "profile",
// 		userId: 1234,
// 	};

// 	const url = await putObject(file);
// 	console.log(url);
// }
// init();