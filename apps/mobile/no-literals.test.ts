import fs from "fs";
import path from "path";

import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import type { Expression } from "@babel/types";

// Scans .tsx files (components and routes). Plain .ts files (hooks, mocks, schemas) hold no JSX; the
// strings they produce are i18n keys, which the i18n test checks against nb.json.

// CLAUDE.md rule 5: UI text lives only in src/i18n/nb.json. This scans every component and route
// file and fails on user-visible string literals: JSX text, and string values (also inside
// ternaries, logical expressions and template literals) of props that users or screen readers see.

const ROOTS = ["src", "app"];
const USER_FACING_PROPS = new Set([
  "title",
  "body",
  "text",
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
  // Props that take an object such as { title, body } or { label, onPress }.
  "empty",
  "action",
]);
const letters = /\p{L}/u;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    const isTest = /\.test\.tsx?$/.test(entry.name) || full.includes(`${path.sep}test${path.sep}`);
    return /\.tsx$/.test(entry.name) && !isTest ? [full] : [];
  });
}

/** Every string that could be shown, found in an expression that is used as text. */
function literalsIn(expression: Expression | null | undefined): string[] {
  if (!expression) return [];
  switch (expression.type) {
    case "StringLiteral":
      return [expression.value];
    case "TemplateLiteral":
      // Only the fixed parts between ${} count; a lone "@" before a variable is not text.
      return expression.quasis.map((q) => q.value.cooked ?? "");
    case "ConditionalExpression":
      return [...literalsIn(expression.consequent), ...literalsIn(expression.alternate)];
    case "LogicalExpression":
      return [...literalsIn(expression.left), ...literalsIn(expression.right)];
    case "ObjectExpression":
      // {{ title: "...", label: "..." }} passed as a prop value.
      return expression.properties.flatMap((property) =>
        property.type === "ObjectProperty" &&
        property.key.type === "Identifier" &&
        USER_FACING_PROPS.has(property.key.name)
          ? literalsIn(property.value as Expression)
          : [],
      );
    case "ParenthesizedExpression":
      return literalsIn(expression.expression);
    default:
      return [];
  }
}

export function findLiterals(source: string, file: string): string[] {
  const ast = parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const found: string[] = [];
  const report = (line: number | undefined, what: string, values: string[]) => {
    for (const value of values) {
      if (letters.test(value)) found.push(`${file}:${line}: ${what} "${value.trim()}"`);
    }
  };

  traverse(ast, {
    JSXText(p) {
      report(p.node.loc?.start.line, "text", [p.node.value]);
    },
    JSXAttribute(p) {
      const name = p.node.name.type === "JSXIdentifier" ? p.node.name.name : "";
      if (!USER_FACING_PROPS.has(name)) return;
      const value = p.node.value;
      if (value?.type === "StringLiteral") {
        report(p.node.loc?.start.line, name, [value.value]);
      } else if (
        value?.type === "JSXExpressionContainer" &&
        value.expression.type !== "JSXEmptyExpression"
      ) {
        report(p.node.loc?.start.line, name, literalsIn(value.expression));
      }
    },
    JSXExpressionContainer(p) {
      // {"text"} or {cond ? "a" : "b"} used as a child of an element.
      if (p.parent.type === "JSXElement" || p.parent.type === "JSXFragment") {
        if (p.node.expression.type !== "JSXEmptyExpression") {
          report(p.node.loc?.start.line, "text", literalsIn(p.node.expression));
        }
      }
    },
  });
  return found;
}

describe("no user-visible string literals outside nb.json", () => {
  const files = ROOTS.flatMap((root) => sourceFiles(path.join(__dirname, root)));

  it("scans the component and route files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("finds no literal text in components or routes", () => {
    const found = files.flatMap((file) => findLiterals(fs.readFileSync(file, "utf8"), file));
    expect(found).toEqual([]);
  });

  describe("scanner self-check", () => {
    const scan = (jsx: string) => findLiterals(`export const A = () => ${jsx};`, "sample.tsx");

    it.each([
      ["JSX text", "<Text>Hallo</Text>"],
      ["a label prop", '<Button label="Lagre" />'],
      ["the body prop", '<MessageState title={t("x")} body="Tomt" />'],
      ["a ternary in a prop", '<Button label={ok ? "Ja" : "Nei"} />'],
      ["a logical expression in a prop", '<Button label={name || "Ukjent"} />'],
      ["a template literal with words", "<Button label={`Hei ${name}`} />"],
      ["a label inside an object prop", '<Panel empty={{ title: "Tomt" }} />'],
      ["an expression child", '<Text>{"Hallo"}</Text>'],
      ["a ternary child", '<Text>{ok ? "Ja" : "Nei"}</Text>'],
    ])("detects %s", (_name, jsx) => {
      expect(scan(jsx).length).toBeGreaterThan(0);
    });

    it.each([
      ["translated text", '<Text>{t("a.b")}</Text>'],
      ["a symbol before a variable", "<Text>{`@${name}`}</Text>"],
      ["a bullet", "<Text>• {t('a')}</Text>"],
      ["non-user-facing props", '<View testID="row" style={{ flex: 1 }} />'],
    ])("allows %s", (_name, jsx) => {
      expect(scan(jsx)).toEqual([]);
    });
  });
});
