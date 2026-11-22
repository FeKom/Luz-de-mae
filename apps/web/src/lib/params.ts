import { notFound } from "next/navigation";
import { ApiError } from "./api";

/** Route ids come from the URL; anything that is not a positive integer is a 404. */
export async function idFrom(params: Promise<{ id: string }>): Promise<number> {
  const { id } = await params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return parsed;
}

export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
