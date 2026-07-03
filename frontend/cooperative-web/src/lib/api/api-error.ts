import { AxiosError } from "axios";

export interface ApiErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorResponse>;

  const message = axiosError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (typeof message === "string") {
    return message;
  }

  return "Something went wrong. Please try again.";
}