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

import { describe, expect, it } from "vitest";
import parser from "../../src/parser";
import viUtils from "../vitest_utils";

describe("collectCustomTypes", () => {
   it("should not collect any types when no types are defined", () => {
      const customTypes = viUtils.collectCustomTypes(`
         export function myFunction() {}
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
         const customTypes = viUtils.collectCustomTypes(`
            export function myFunction(abc: ${typeName}): ${typeName} {}
         `);
         expect(customTypes).toStrictEqual(new Set());
      });
   });

   it("should collect custom types from return type literals", () => {
      const customTypes = viUtils.collectCustomTypes(`
         export function myFunction(): CustomType {}
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType"]));
   });

   it("should collect custom types from param type literals", () => {
      const customTypes = viUtils.collectCustomTypes(`
         export function myFunction(abc: CustomType) {}
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType"]));
   });

   it("should collect custom type array definitions", () => {
      const customTypes = viUtils.collectCustomTypes(`
         export function myFunction(abc: CustomType1[]): CustomType2[] {}
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1", "CustomType2"]));
   });

   it("should collect custom types from type unions", () => {
      const customTypes = viUtils.collectCustomTypes(`
         export function myFunction(abc: CustomType1 | CustomType2): CustomType2 | CustomType3 {}
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1", "CustomType2", "CustomType3"]));
   });

   it("should collect custom types from type intersections", () => {
      const customTypes = viUtils.collectCustomTypes(`
         export function myFunction(abc: CustomType1 & CustomType2): CustomType2 & CustomType3 {}
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1", "CustomType2", "CustomType3"]));
   });

   it("should collect custom types from inlined object types", () => {
      const customTypes = viUtils.collectCustomTypes(`
         export function myFunction(abc: { abc: CustomType1 }): { def: CustomType2 } {}
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1", "CustomType2"]));
   });

   it("should collect custom types from within destructured objects", () => {
      const customTypes = viUtils.collectCustomTypes(`
         export function myFunction({ abc: CustomType1 }) {}
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1"]));
   });

   it("should collect custom types from destructured object literal typehints", () => {
      const customTypes = viUtils.collectCustomTypes(`
         export function myFunction({ abc }: CustomType1) {}
      `);
      expect(customTypes).toStrictEqual(new Set(["CustomType1"]));
   });
});
