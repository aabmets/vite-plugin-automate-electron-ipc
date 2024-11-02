/*
 *   MIT License
 *
 *   Copyright (c) 2024, Mattias Aabmets
 *
 *   The contents of this file are subject to the terms and conditions defined in the License.
 *   You may not use, modify, or distribute this file except in compliance with the License.
 *
 *   SPDX-License-Identifier: MIT
 */

import type { Plugin } from "vite";

interface IPCAutomationOption {
   mainHandlersDir: string;
   browserPreloadFile: string;
   rendererTypesFile: string;
}

declare module "vite-plugin-electron-auto-ipc" {
   export function ipcAutomation(options?: IPCAutomationOption[]): Plugin;
}

export type { IPCAutomationOption };
