import axios, { AxiosInstance } from 'axios';
import type { ApiResponse } from '@carelink/shared-types';
import { ERROR_CODES } from '@carelink/shared-types';

export interface ClientOptions {
  baseURL?: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
}

export function createApiClient(options: ClientOptions = {}): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL ?? '/api',
    timeout: 15000,
  });

  client.interceptors.request.use((config) => {
    const token = options.getToken?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const body = response.data as ApiResponse<unknown>;
      if (body && typeof body === 'object' && 'code' in body) {
        if (body.code !== 0) {
          return Promise.reject(new ApiError(body.code, body.message));
        }
        response.data = body.data;
      }
      return response;
    },
    (error) => {
      const body = error.response?.data;
      if (body && typeof body === 'object' && 'code' in body) {
        if (
          body.code === ERROR_CODES.UNAUTHENTICATED ||
          body.code === ERROR_CODES.SESSION_EXPIRED
        ) {
          options.onUnauthorized?.();
        }
        return Promise.reject(new ApiError(body.code, body.message));
      }
      return Promise.reject(new ApiError(ERROR_CODES.INTERNAL, '网络错误或服务不可用'));
    },
  );

  return client;
}

export class ApiError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}