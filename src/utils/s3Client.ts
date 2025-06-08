import { GetObjectCommand, S3Client, PutObjectCommand, ListObjectsV2Command, DeleteBucketCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from 'dotenv'
import { UploadFiles } from "../interfaces/fileInterfaces";
// import { createWriteStream, existsSync, mkdirSync } from "fs";
// import { pipeline } from "stream";
// import { promisify } from "util";
// import { boolean } from "zod";
// import path from "path";
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
		// console.log("file data ", fileType)
		const command = new PutObjectCommand({
			Bucket: process.env.BucketName!,
			Key: `uploads/users/${userId}/${fileName+"_"+uuid}`,
			ContentType: contentType,
		})
		const url = await getSignedUrl(s3Client, command)
		// return {
		// 	success:true,
		// 	signedUrl: url
		// }
		// console.log("new url ", url);
		// return url
		return { error: false, signedUrl: url, message: "File url generated successfully" }
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


export const isFileExists = async (filePath: string) => {
	try {
		const command = new HeadObjectCommand({
			Bucket: process.env.BucketName!,
			Key: filePath,
		});

		const response = await s3Client.send(command);
		console.log("File exists:", response.$metadata.httpStatusCode === 200);
		return response.$metadata.httpStatusCode === 200;

	} catch (error) {
		return false;
	}

}

// isFileExists("uploads/users/2/0eb136dd-c792-48fb-a0a8-50c778d57236_single.mp4")


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

// const streamPipeline = promisify(pipeline);



// const getObject = async (filePath: string) => {
// 	try {
// 		const command = new GetObjectCommand({
// 			Bucket: process.env.BucketName!,
// 			Key: filePath,
// 		});
// 		const fileName = path.basename(filePath);
// 		const downloadsDir = path.join(__dirname, "downloads");

// 		if (!existsSync(downloadsDir)) {
// 			mkdirSync(downloadsDir);
// 		}

// 		const localPath = path.join(downloadsDir, "fileName.png");
// 		const response = await s3Client.send(command);
// 		console.log("Retrieved object:", response);
// 		if (!response.Body) {
// 			throw new Error("No body in response");
// 		}
// 		await streamPipeline(response.Body, createWriteStream(localPath));
// 		// const buffer = Buffer.from(await response?.Body.transformToByteArray())

// 		// console.log("Object content as buffer:", buffer);

// 		return response;
// 	} catch (error) {
// 		console.error("Error getting object:", error);
// 		throw error;
// 	}
// }


// getObject("uploads/users/2/32947989-a3a3-43f5-b5c7-8b3c32cff610_smartphone-1170288_1280.png")