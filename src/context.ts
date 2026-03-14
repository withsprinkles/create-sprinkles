import type { z } from "zod";

import type { options } from "./options.ts";

type Options = { [Key in keyof typeof options]: z.infer<(typeof options)[Key]> };

export interface TemplateContext extends Options {
    isSPA: boolean;
    isSSR: boolean;
    isRSC: boolean;
    isPackage: boolean;
    isReactRouter: boolean;
    hasConvex: boolean;
}

export function buildContext(opts: Options): TemplateContext {
    return {
        ...opts,
        hasConvex: opts.kind === "react-router-spa" || opts.kind === "react-router-ssr",
        isPackage: opts.kind === "ts-package",
        isRSC: opts.kind === "react-router-rsc",
        isReactRouter: opts.kind !== "ts-package",
        isSPA: opts.kind === "react-router-spa",
        isSSR: opts.kind === "react-router-ssr",
    };
}
