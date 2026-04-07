import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 s"),
});

export default async function middleware(
    request: NextRequest,
    event: NextFetchEvent,
): Promise<Response | undefined> {
    const ip = request.ip ?? "127.0.0.1";
    const { success, pending, limit, reset, remaining } =
        await ratelimit.limit(ip);
    if (success) {
        return NextResponse.next();
    }

    if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
            { error: "Too many requests" },
            { status: 429, headers: { "Retry-After": Math.max(reset, 1).toString() } }
        );
    }

    return NextResponse.redirect(new URL("/blocked", request.url));
}

export const config = {
    matcher: ["/", "/api/:path*"],
};
