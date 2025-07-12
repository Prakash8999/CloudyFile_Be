"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteObject = exports.getObject = exports.isFileExists = exports.putObject = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const dotenv_1 = require("dotenv");
// import { createWriteStream, existsSync, mkdirSync } from "fs";
// import { pipeline } from "stream";
// import { promisify } from "util";
// import { boolean } from "zod";
// import path from "path";
(0, dotenv_1.config)();
// console.log( "Starting...", process.env.Region ,process.env.AccessKeyId, process.env.SecretAccessKey  );
const s3Client = new client_s3_1.S3Client({
    region: process.env.Region,
    credentials: {
        accessKeyId: process.env.AccessKeyId,
        secretAccessKey: process.env.SecretAccessKey,
    }
});
const putObject = async (fileData) => {
    try {
        const { fileType, fileName, contentType, userId, uuid } = fileData;
        // console.log("file data ", fileType)
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.BucketName,
            Key: `uploads/users/${userId}/${fileName + "_" + uuid}`,
            ContentType: contentType,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command);
        // return {
        // 	success:true,
        // 	signedUrl: url
        // }
        // console.log("new url ", url);
        // return url
        return { error: false, signedUrl: url, message: "File url generated successfully" };
    }
    catch (error) {
        console.log("error ", error);
        return {
            error: true,
            signedUrl: null,
            message: error?.message,
        };
        // throw error
    }
};
exports.putObject = putObject;
const isFileExists = async (filePath) => {
    try {
        const command = new client_s3_1.HeadObjectCommand({
            Bucket: process.env.BucketName,
            Key: filePath,
        });
        const response = await s3Client.send(command);
        console.log("File exists:", response.$metadata.httpStatusCode === 200);
        return response.$metadata.httpStatusCode === 200;
    }
    catch (error) {
        return false;
    }
};
exports.isFileExists = isFileExists;
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
const getObject = async (key) => {
    try {
        const headCommand = new client_s3_1.HeadObjectCommand({
            Bucket: process.env.BucketName,
            Key: key,
        });
        const headResponse = await s3Client.send(headCommand);
        console.log("File exists:", headResponse.$metadata.httpStatusCode === 200);
        if (headResponse.$metadata.httpStatusCode !== 200) {
            console.log("File status:", headResponse.$metadata.httpStatusCode);
            return {
                status: 404,
                message: "Failed to retrieve file",
                error: true,
                signedUrl: null
            };
        }
        const command = new client_s3_1.GetObjectCommand({
            Bucket: process.env.BucketName,
            Key: key,
        });
        const readSignedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, {
            expiresIn: 300 //5 minutes
        });
        // console.log("signed url", readSignedUrl)
        return {
            status: 200,
            message: "File found",
            error: false,
            signedUrl: readSignedUrl
        };
    }
    catch (error) {
        console.error("Error getting object:", error);
        return {
            status: 500,
            message: error.message,
            error: true,
            signedUrl: null
        };
    }
};
exports.getObject = getObject;
// getObject("uploads/users/3/inyoung-jung-IfyQek9noDU-unsplash.jpg_c39dbbef-fce9-48ac-8a12-29f533066526")
const deleteObject = async (keys, BucketName) => {
    try {
        // const command = new DeleteObjectCommand({
        // 	Bucket: process.env.BucketName!,
        // 	Key: key,
        // });
        const command = new client_s3_1.DeleteObjectsCommand({
            Bucket: BucketName,
            Delete: {
                Objects: keys.map((key) => ({ Key: key })),
                Quiet: false, // Set true if you don't need list of deleted keys
            },
        });
        const deleteData = await s3Client.send(command);
        console.log("deleteData ", deleteData);
        const statusCode = deleteData?.$metadata?.httpStatusCode;
        if (statusCode === 204 || statusCode === 200) {
            return {
                status: 200,
                message: "File deleted successfully",
                error: false,
            };
        }
        else {
            return {
                status: statusCode || 500,
                message: "Unexpected status code received",
                error: true,
            };
        }
    }
    catch (error) {
        console.error("Error deleting object:", error);
        return {
            status: 500,
            message: error.message || "Unknown error",
            error: true,
        };
    }
};
exports.deleteObject = deleteObject;
