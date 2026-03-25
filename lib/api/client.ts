import type { ApiResponse } from "@/types/api";

export async function postJson<TRequest, TResponse>(
  url: string,
  body: TRequest
): Promise<ApiResponse<TResponse>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as ApiResponse<TResponse>;
  return json;
}

export async function getJson<TResponse>(url: string): Promise<ApiResponse<TResponse>> {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const json = (await response.json()) as ApiResponse<TResponse>;
  return json;
}
