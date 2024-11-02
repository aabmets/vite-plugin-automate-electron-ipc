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

import ts from "typescript";
import utils from "./utils";

export type TypeKind = "type" | "interface";
export type ImportKind = "import" | "require";

export interface TypeSpec {
   kind: TypeKind;
   name: string;
   isExported: boolean;
   definition: string;
}

export interface ImportSpec {
   kind: ImportKind;
   fromPath: string | null;
   definition: string;
   customTypes: string[];
}

export interface FuncParam {
   name: string;
   type: string | null;
   defaultValue: string | null;
}

export interface FuncSpec {
   name: string;
   params: FuncParam[];
   returnType: string;
   customTypes: string[];
}

export interface ParsedContents {
   funcSpecArray: FuncSpec[];
   typeSpecArray: TypeSpec[];
   importSpecArray: ImportSpec[];
}

export function getParserRegex(): RegExp {
   return utils.concatRegex(
      [
         /^export\s+function\s+\w+\s*\([^)]*\)\s*(?::\s*[^<\n]+)?\s+{\n/,
         /|^(export\s+)?(interface)\s+(\w+)\s*{[\s\S]*?\n}\n/,
         /|^(export\s+)?(type)\s+(\w+)\s*=\s*[\s\S]*?;\n/,
         /|^(import\s+)[\s\S]*?from\s*['"](.*?)['"];?\n/,
         /|^const[\s\S]*?(require)\(\s*['"](.*?)['"]\s*\);?\n/,
      ],
      "gm",
   );
}

export function isBuiltinType(typeName: string): boolean {
   return new Set([
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
   ]).has(typeName);
}

export function collectCustomTypes(
   node: ts.Node | ts.TypeNode | ts.ImportDeclaration | undefined,
   customTypes: Set<string>,
   sourceFile: ts.SourceFile,
): void {
   if (!node) {
      return;
   } else if (ts.isTypeReferenceNode(node)) {
      const name = node.typeName.getText(sourceFile);
      if (!isBuiltinType(name)) {
         customTypes.add(name);
      }
   } else if (ts.isTypeLiteralNode(node)) {
      node.members.forEach((member) => {
         if (ts.isPropertySignature(member) && member.type) {
            collectCustomTypes(member.type, customTypes, sourceFile);
         }
      });
   } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
      node.types.forEach((subType) => collectCustomTypes(subType, customTypes, sourceFile));
   } else if (ts.isBindingElement(node)) {
      const children = node.getChildren();
      if (children.length === 3 && ts.isIdentifier(children[2])) {
         const name = children[2].getText(sourceFile);
         if (!isBuiltinType(name)) {
            customTypes.add(name);
         }
      }
   } else if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
         clause.namedBindings.elements.forEach((element) => {
            const name = element.name.getText(sourceFile);
            if ((clause?.isTypeOnly || element.isTypeOnly) && !isBuiltinType(name)) {
               customTypes.add(name);
            }
         });
      }
   }
   node.forEachChild((child) => collectCustomTypes(child, customTypes, sourceFile));
}

export function cctFromCode(code: string): Set<string> {
   const sourceFile = ts.createSourceFile(
      "temp.ts",
      utils.dedent(code),
      ts.ScriptTarget.Latest,
      true,
   );
   const customTypes = new Set<string>();

   ts.forEachChild(sourceFile, (node: ts.Node) => {
      collectCustomTypes(node, customTypes, sourceFile);
   });
   return customTypes;
}

export function getFuncSpecs(code: string, skipDedent = false): FuncSpec[] {
   const normalizedCode = skipDedent ? code : utils.dedent(code);
   const sourceFile = ts.createSourceFile("temp.ts", normalizedCode, ts.ScriptTarget.Latest, true);
   const funcSpecArray: FuncSpec[] = [];

   ts.forEachChild(sourceFile, (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node)) {
         const customTypes = new Set<string>();
         collectCustomTypes(node, customTypes, sourceFile);
         funcSpecArray.push({
            name: node.name?.text || "",
            customTypes: Array.from(customTypes),
            returnType: node.type ? node.type.getText(sourceFile) : "void",
            params: (node.parameters || []).map((param) => {
               return {
                  name: param.name.getText(sourceFile),
                  type: param.type ? param.type.getText(sourceFile) : null,
                  defaultValue: param.initializer ? param.initializer.getText(sourceFile) : null,
               };
            }),
         });
      }
   });
   return funcSpecArray;
}

export function parseSpecs(contents: string): ParsedContents {
   const normalizedContents = utils.dedent(contents);
   const regex = getParserRegex();
   const importSpecArray: ImportSpec[] = [];
   const typeSpecArray: TypeSpec[] = [];
   const funcSignatures: string[] = [];

   let match: RegExpExecArray | null = regex.exec(normalizedContents);
   while (match !== null) {
      const kind = (match[2] ?? match[5] ?? match[7] ?? match[9] ?? "function").trim();
      if (kind === "function") {
         funcSignatures.push(`${match[0].trimEnd()}}\n`);
      } else if (["type", "interface"].includes(kind)) {
         typeSpecArray.push({
            kind: kind as TypeKind,
            name: match[3] ?? match[6],
            isExported: (match[1] ?? match[4] ?? "").trim() === "export",
            definition: match[0],
         });
      } else if (["import", "require"].includes(kind)) {
         importSpecArray.push({
            kind: kind as ImportKind,
            fromPath: match[8] ?? match[10] ?? null,
            definition: match[0],
            customTypes: Array.from(cctFromCode(match[0])),
         });
      }
      match = regex.exec(normalizedContents);
   }
   const funcSpecArray: FuncSpec[] = getFuncSpecs(funcSignatures.join(""), true);
   return { funcSpecArray, typeSpecArray, importSpecArray };
}

export default {
   getParserRegex,
   isBuiltinType,
   collectCustomTypes,
   cctFromCode,
   getFuncSpecs,
   parseSpecs,
};
