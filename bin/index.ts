#!/usr/bin/env node
import { runTemplateCLI } from "bingo";

import template from "../src/template.ts";

// Workbench is only for bootstrapping new projects, never transition mode
process.argv.push("--mode", "setup");

process.exitCode = await runTemplateCLI(template);
