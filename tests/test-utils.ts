// tests/test-utils.ts
import type { NextRequest } from "next/server";
import { expect } from "vitest";

export const makeListRequest = (rawUrl: string): NextRequest =>
    ({ nextUrl: new URL(rawUrl) } as unknown as NextRequest);

export const makeItemCtx = (id: string) => ({ params: Promise.resolve({ id }) });

export async function readJson<T>(res: Response): Promise<T> {
    const data = (await res.json()) as unknown;
    return data as T;
}

export const readStatus = (res: Response): number => res.status;

export function expectOk(res: Response) {
    expect(readStatus(res)).toBe(200);
}
export function expectBadRequest(res: Response) {
    expect(readStatus(res)).toBe(400);
}
