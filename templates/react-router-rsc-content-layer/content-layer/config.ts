import type { Schema } from "@remix-run/data-schema";

import { createSchema, fail } from "@remix-run/data-schema";

import type { ContentLoader, SchemaContext } from "./api.ts";

export function defineCollection<
    S extends Schema<any, any> | ((ctx: SchemaContext) => Schema<any, any>),
>(input: { loader: ContentLoader; schema: S }): { loader: ContentLoader; schema: S } {
    return input;
}

export function reference(collection: string): Schema<string, { collection: string; id: string }> {
    return createSchema((value, context) => {
        if (typeof value !== "string") {
            return fail("Expected a string reference ID", context.path);
        }
        return { value: { collection, id: value } };
    });
}
