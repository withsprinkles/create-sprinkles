import type { DefaultOptions } from "@tanstack/react-query";

import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(overrides: DefaultOptions["queries"] = {}) {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // With SSR, we usually want to set some default staleTime
                // Above 0 to avoid refetching immediately on the client
                staleTime: 60 * 1000,
                // Allows us to use `const { promise } = useQuery(...)`
                // Along with `React.use(promise)`
                experimental_prefetchInRender: true,
                ...overrides,
            },
        },
    });
}
