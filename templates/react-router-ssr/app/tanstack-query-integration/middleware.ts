import type { QueryClient } from "@tanstack/react-query";
import assert from "node:assert";
import { createContext, RouterContextProvider, type MiddlewareFunction } from "react-router";

const QUERY_CLIENT = createContext<QueryClient | null>(null);

export function setQueryClient(createClient: () => QueryClient): MiddlewareFunction {
    return ({ context }) => context.set(QUERY_CLIENT, createClient());
}

export function getQueryClient(context: Readonly<RouterContextProvider>): QueryClient {
    const client = context.get(QUERY_CLIENT);
    assert(client, "must use `setQueryClient` to set the query client for this application");
    return client;
}
