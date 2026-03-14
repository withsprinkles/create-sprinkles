import { createTemplate } from "bingo";

import { options } from "./options.ts";

export default createTemplate({
    about: {
        description: "Get started with development by creating projects from templates quickly.",
        name: "@withsprinkles/workbench",
    },

    options,

    produce() {
        return {
            files: {},
        };
    },
});
