/*
 *   Apache License 2.0
 *
 *   Copyright (c) 2024, Mattias Aabmets
 *
 *   The contents of this file are subject to the terms and conditions defined in the License.
 *   You may not use, modify, or distribute this file except in compliance with the License.
 *
 *   SPDX-License-Identifier: Apache-2.0
 */

import fsp from "node:fs/promises";
import path from "node:path";
import type * as t from "@types";
import utils from "../utils.js";
import { ImportsGenerator } from "./imports-generator.js";

export class BaseWriter {
   protected importsGenerator: ImportsGenerator;
   protected resolvedConfig: t.IPCResolvedConfig;
   protected pfsArray: t.ParsedFileSpecs[];
   protected indents: string[];
   protected notice = utils.dedent(`
      // NOTICE: THIS FILE WAS GENERATED BY AUTOMATE-ELECTRON-IPC PLUGIN.
      // ANY CHANGES TO THIS FILE WILL NOT PERSIST BETWEEN GENERATIONS.
   `);

   public constructor(resolvedConfig: t.IPCResolvedConfig, pfsArray: t.ParsedFileSpecs[]) {
      if (this.constructor === BaseWriter) {
         throw new Error(`Cannot instantiate abstract base class '${this.constructor.name}'`);
      }
      this.pfsArray = pfsArray;
      this.resolvedConfig = resolvedConfig;
      this.importsGenerator = new ImportsGenerator(
         resolvedConfig.projectUsesNodeNext,
         this.getTargetFilePath(),
      );
      this.indents = this.getCodeIndents();
   }

   private throwAbstractError(methodName: string): void {
      throw new Error(`Must implement method '${methodName}' in '${this.constructor.name}' class`);
   }

   protected getTargetFilePath(): string {
      this.throwAbstractError("getTargetFilePath");
      return null as unknown as string;
   }

   protected renderEmptyFileContents(): string {
      this.throwAbstractError("renderEmptyFileContents");
      return null as unknown as string;
   }

   protected renderFileContents(): string {
      this.throwAbstractError("generateFileContents");
      return null as unknown as string;
   }

   protected getCodeIndents(): string[] {
      return [1, 2, 3, 4, 5].map((value) => {
         return " ".repeat(this.resolvedConfig.codeIndent).repeat(value);
      });
   }

   protected injectEventTypehint(sigDef: string): string {
      return sigDef.replace("(", "(event: IpcMainEvent, ");
   }

   protected getOriginalParams(spec: t.ChannelSpec, withTypes: boolean): string {
      return spec.signature.params
         .map((param) => {
            const typeHint = withTypes ? `: ${param.type || "any"}` : "";
            return `${param.name}${typeHint}`;
         })
         .join(", ");
   }

   protected sortCallablesArray(callablesArray: string[]): string[] {
      return callablesArray.sort((a, b) => {
         const prefixOrder = ["on", "send"];
         const getPrefixRank = (value: string) => {
            for (let i = 0; i < prefixOrder.length; i++) {
               if (value.startsWith(prefixOrder[i])) {
                  return i;
               }
            }
            return prefixOrder.length;
         };
         const prefixRankA = getPrefixRank(a);
         const prefixRankB = getPrefixRank(b);
         if (prefixRankA === prefixRankB) {
            return a.localeCompare(b);
         }
         return prefixRankA - prefixRankB;
      });
   }

   public async write(withNotice = true) {
      const targetFilePath = this.getTargetFilePath();
      const fileDirectory = path.dirname(targetFilePath);
      await fsp.mkdir(fileDirectory, { recursive: true });
      let contents: string;
      if (this.pfsArray.length === 0) {
         contents = this.renderEmptyFileContents();
      } else {
         contents = this.renderFileContents();
      }
      if (withNotice) {
         contents = `${this.notice}\n${contents}`;
      }
      await fsp.writeFile(targetFilePath, contents);
   }
}
