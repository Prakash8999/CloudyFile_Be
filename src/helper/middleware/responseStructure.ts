// src/utils/responseStructure.ts
export interface SuccessResponse<T> {
    status: "success";
    code: number;
    error: false;
    meta?: any;
    data: T | [];
    message: string;
    assetsBaseUrl?: string;
  }
  
  export interface ErrorResponse {
    status: "failed";
    code: number;
    error: true;
    data?: any;
    message: string;
  }
  
  export interface ValidationErrorResponse {
    code: 422;
    error: true;
    data: any[];
    message: "Validation errors";
  }
  
  // ✅ Success Response
  export const success = <T>(message: string, results: T, statusCode: number, meta?: any): SuccessResponse<T> => {
    return {
      status: "success",
      code: statusCode,
      error: false,
      meta,
      data: results || [],
      message,
      assetsBaseUrl: process.env.r2_base_url,
    };
  };
  
  // ✅ Error Response
  export const error = (message: string, statusCode: number, err?: any): ErrorResponse => {
    const codes = [200, 201, 400, 401, 404, 403, 409, 422, 500];
    const findCode = codes.includes(statusCode) ? statusCode : 500;
  
    return {
      status: "failed",
      code: findCode,
      error: true,
      data: err || [],
      message,
    };
  };
  
  // ✅ Validation Response
  export const validation = (errors: any[]): ValidationErrorResponse => {
    return {
      code: 422,
      error: true,
      data: errors || [],
      message: "Validation errors",
    };
  };
  