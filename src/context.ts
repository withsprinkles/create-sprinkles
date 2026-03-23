import type { z } from "zod";

import type { options } from "./options.ts";

type Options = {
    [Key in keyof typeof options as (typeof options)[Key] extends z.ZodOptional<z.ZodTypeAny>
        ? never
        : Key]: z.infer<(typeof options)[Key]>;
} & {
    [Key in keyof typeof options as (typeof options)[Key] extends z.ZodOptional<z.ZodTypeAny>
        ? Key
        : never]?: z.infer<(typeof options)[Key]>;
};

export interface TemplateContext extends Options {
    isSPA: boolean;
    isSSR: boolean;
    isRSC: boolean;
    isPackage: boolean;
    isReactRouter: boolean;
    hasConvex: boolean;
    hasContentLayer: boolean;
    hasSEA: boolean;
    ssr: boolean;
}

export function buildContext(opts: Options): TemplateContext {
    const isSPA = opts.kind === "react-router-spa";
    const isSSR = opts.kind === "react-router-ssr";
    const isRSC = opts.kind === "react-router-rsc";

    return {
        ...opts,
        hasContentLayer: isRSC && Boolean(opts.contentLayer),
        hasConvex: (isSPA || isSSR) && Boolean(opts.convex),
        hasSEA: isRSC && Boolean(opts.sea),
        isPackage: opts.kind === "ts-package",
        isRSC,
        isReactRouter: opts.kind !== "ts-package",
        isSPA,
        isSSR,
        ssr: isSSR || isRSC,
    };
}
