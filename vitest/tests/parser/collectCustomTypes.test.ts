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

import parser from "@src/parser.js";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function collectCustomTypes(code: string): Set<string> {
   const src = ts.createSourceFile("temp.ts", code, ts.ScriptTarget.Latest, true);
   const set = new Set<string>();
   ts.forEachChild(src, (node: ts.Node) => {
      parser.collectCustomTypes(node, src, set);
   });
   return set;
}

describe("collectCustomTypes", () => {
   it("should not collect any types when no types are defined", () => {
      const customTypes = collectCustomTypes(`
         type as (arg1, arg2, arg3) => void;
      `);
      expect(customTypes).toStrictEqual(new Set());
   });

   it("should not collect any builtin types", () => {
      [
         "string",
         "number",
         "boolean",
         "void",
         "any",
         "unknown",
         "null",
         "undefined",
         "never",
         "object",
         "Function",
      ].forEach((typeName) => {
         expect(parser.isBuiltinType(typeName)).toStrictEqual(true);
         const customTypes = collectCustomTypes(`
            type as (arg: ${typeName}) => ${typeName};
         `);
         expect(customTypes).toStrictEqual(new Set());
      });
   });

   it("should collect custom types from return type literals", () => {
      const customTypes = collectCustomTypes(`
         type as (arg) => CustomType;
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType"]));
   });

   it("should collect custom types from param type literals", () => {
      const customTypes = collectCustomTypes(`
         type as (arg: CustomType) => void;
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType"]));
   });

   it("should collect custom type array definitions", () => {
      const customTypes = collectCustomTypes(`
         type as (arg: CustomType1[]) => CustomType2[];
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1", "CustomType2"]));
   });

   it("should collect custom types from type unions", () => {
      const customTypes = collectCustomTypes(`
         type as (arg: CustomType1 | CustomType2) => CustomType2 | CustomType3;
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1", "CustomType2", "CustomType3"]));
   });

   it("should collect custom types from type intersections", () => {
      const customTypes = collectCustomTypes(`
         type as (arg: CustomType1 & CustomType2) => CustomType2 & CustomType3;
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1", "CustomType2", "CustomType3"]));
   });

   it("should collect custom types from inlined object types", () => {
      const customTypes = collectCustomTypes(`
         type as (arg: { abc: CustomType1 }) => { def: CustomType2 };
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1", "CustomType2"]));
   });

   it("should collect custom types from within destructured objects", () => {
      const customTypes = collectCustomTypes(`
         type as ({ abc: CustomType }) => void
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType"]));
   });

   it("should collect custom types from destructured object literal typehints", () => {
      const customTypes = collectCustomTypes(`
         type as ({ abc }: CustomType) => void
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType"]));
   });

   it("should not collect generics from argument and return custom types", () => {
      const customTypes = collectCustomTypes(`
         type as (arg: CustomType1<string>) => CustomType2<number>
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1", "CustomType2"]));
   });

   it("should collect custom types from named types import syntax", () => {
      const customTypes = collectCustomTypes(`
         import type { CustomType } from 'module-name';
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType"]));
   });

   it("should collect custom types from objects and named types import syntax", () => {
      const customTypes = collectCustomTypes(`
         import { namedExport, type CustomType } from 'module-name';
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType"]));
   });
});
