import { dehydrate } from "@tanstack/react-query";
import type {
    DehydratedState,
    DefaultError,
    QueryKey,
    EnsureQueryDataOptions,
} from "@tanstack/react-query";
import { useMatches } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { on } from "@remix-run/interaction";
import { getQueryClient } from "./middleware";

const DEHYDRATED_STATE_KEY = "@tanstack/react-query:dehydrated-state";

type MaybePromise<T> = T | Promise<T>;

function mergeDehydratedStates(states: DehydratedState[]): DehydratedState {
    const allMutations = states.flatMap(s => s.mutations ?? []);
    const allQueries = states.flatMap(s => s.queries ?? []);

    // Last-write-wins de-dupe by queryHash
    const byHash = new Map<string, (typeof allQueries)[number]>();

    for (const query of allQueries) {
        if (!query) continue;
        byHash.set(query.queryHash, query);
    }

    return {
        mutations: allMutations,
        queries: Array.from(byHash.values()),
    };
}

export function useDehydratedState() {
    const matches = useMatches();
    const states = matches
        .map(m => (m.loaderData as any)?.[DEHYDRATED_STATE_KEY] as DehydratedState | undefined)
        .filter((s): s is DehydratedState => !!s);

    return states.length ? mergeDehydratedStates(states) : undefined;
}

export function createPreloader<
    TLoaderArgs extends LoaderFunctionArgs,
    TData extends Record<string, unknown> | void
>(
    fn: (args: QueryLoaderArgs<TLoaderArgs>) => MaybePromise<TData | Response>
): QueryLoader<TLoaderArgs, TData> {
    return (async args => {
        const prefetches: Promise<any>[] = [];
        const query = getQueryClient(args.context);

        // If the navigation is aborted, cancel any in-flight queries
        if (args.request.signal) {
            if (args.request.signal.aborted) {
                query.cancelQueries();
            } else {
                on(args.request.signal, {
                    abort: {
                        once: true,
                        listener: () => {
                            query.cancelQueries();
                        },
                    },
                });
            }
        }

        function preload<
            TQueryFnData,
            TError = DefaultError,
            TData = TQueryFnData,
            TQueryKey extends QueryKey = QueryKey
        >(options: EnsureQueryDataOptions<TQueryFnData, TError, TData, TQueryKey>): Promise<TData> {
            const result = query.ensureQueryData(options);
            prefetches.push(result);
            return result;
        }

        const result = await fn({ ...args, preload });

        if (result instanceof Response) {
            return result;
        }

        if (args.request.signal.aborted) {
            throw args.request.signal.reason ?? new DOMException("Aborted", "AbortError");
        }

        await Promise.all(prefetches);

        if (args.request.signal.aborted) {
            throw args.request.signal.reason ?? new DOMException("Aborted", "AbortError");
        }

        const dehydratedState = { [DEHYDRATED_STATE_KEY]: dehydrate(query) };

        return {
            ...result,
            ...dehydratedState,
        };
    }) as QueryLoader<TLoaderArgs, TData>;
}

type WithDehydratedState<TData extends object | void> = (TData extends void ? {} : TData) & {
    [DEHYDRATED_STATE_KEY]: DehydratedState;
};

export type QueryLoaderReturn<TData extends object | void> = Promise<
    WithDehydratedState<TData> | Response
>;

export type QueryLoader<LoaderArgs, TData extends object | void> = (
    ctx: LoaderArgs
) => QueryLoaderReturn<TData>;

export type QueryLoaderArgs<Args extends LoaderFunctionArgs = LoaderFunctionArgs> = Args & {
    preload<
        TQueryFnData,
        TError = DefaultError,
        TData = TQueryFnData,
        TQueryKey extends QueryKey = QueryKey
    >(
        options: EnsureQueryDataOptions<TQueryFnData, TError, TData, TQueryKey>
    ): Promise<TData>;
};
