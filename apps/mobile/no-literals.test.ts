import fs from "fs";
import path from "path";

import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

// CLAUDE.md rule 5: UI text lives only in src/i18n/nb.json. This scans every component and route
// file and fails on user-visible string literals: JSX text, and literal values of props that
// screen readers or users see.

const ROOTS = ["src", "app"];
const USER_FACING_PROPS = new Set([
  "title",
  "label",
  "placeholder",
  "accessibilityLabel",
  "accessibilityHint",
  "hint",
  "error",
  "description",
  "message",
  "confirmLabel",
  "cancelLabel",
]);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    const isTest = /\.test\.tsx?$/.test(entry.name) || full.includes(`${path.sep}test${path.sep}`);
    return /\.tsx$/.test(entry.name) && !isTest ? [full] : [];
  });
}

function findLiterals(file: string): string[] {
  const ast = parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  const found: string[] = [];
  const letters = /\p{L}/u;

  traverse(ast, {
    JSXText(p) {
      if (letters.test(p.node.value))
        found.push(`${p.node.loc?.start.line}: text "${p.node.value.trim()}"`);
    },
    JSXAttribute(p) {
      const name = p.node.name.type === "JSXIdentifier" ? p.node.name.name : "";
      const value = p.node.value;
      if (
        USER_FACING_PROPS.has(name) &&
        value?.type === "StringLiteral" &&
        letters.test(value.value)
      ) {
        found.push(`${p.node.loc?.start.line}: ${name}="${value.value}"`);
      }
    },
    JSXExpressionContainer(p) {
      const parent = p.parent;
      if (parent.type === "JSXElement" && p.node.expression.type === "StringLiteral") {
        if (letters.test(p.node.expression.value)) {
          found.push(`${p.node.loc?.start.line}: text {"${p.node.expression.value}"}`);
        }
      }
    },
  });
  return found.map((entry) => `${file}:${entry}`);
}

describe("no user-visible string literals outside nb.json", () => {
  const files = ROOTS.flatMap((root) => sourceFiles(path.join(__dirname, root)));

  it("scans the component and route files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("finds no literal text in components or routes", () => {
    expect(files.flatMap(findLiterals)).toEqual([]);
  });

  it("detects literals (self-check of the scanner)", () => {
    const sample = path.join(__dirname, "src", "test", "__sample_literal__.tsx");
    fs.writeFileSync(
      sample,
      'export const A = () => <Text accessibilityLabel="Hei">Hallo</Text>;\n',
    );
    try {
      expect(findLiterals(sample)).toHaveLength(2);
    } finally {
      fs.unlinkSync(sample);
    }
  });
});
