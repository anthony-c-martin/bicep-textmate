import * as tm from "@azure-tools/tmlanguage-generator";
import fs from "fs/promises";
import path from "path";

const grammarJson = path.resolve(__dirname, '../../bicep.tmlanguage.json');

type IncludeRule = tm.IncludeRule<BicepScope>;
type BeginEndRule = tm.BeginEndRule<BicepScope>;
type MatchRule = tm.MatchRule<BicepScope>;
type Grammar = tm.Grammar<BicepScope>;

type BicepScope =
  | "comment.block.bicep"
  | "comment.line.double-slash.bicep"
  | "constant.character.escape.bicep"
  | "constant.numeric.bicep"
  | "constant.language.bicep"
  | "entity.name.type.bicep"
  | "entity.name.function.bicep"
  | "keyword.control.declaration.bicep"
  | "keyword.other.bicep"
  | "string.quoted.single.bicep"
  | "string.quoted.multi.bicep"
  | "variable.name.bicep"
  | "variable.other.readwrite.bicep"
  | "variable.other.property.bicep"
  | "meta.objectliteral.bicep"
  | "meta.object.member.bicep"
  | "punctuation.definition.template-expression.begin.bicep" 
  | "punctuation.definition.template-expression.end.bicep";

const meta: typeof tm.meta = tm.meta;
const identifierStart = "[_$[:alpha:]]";
const identifierContinue = "[_$[:alnum:]]";
const beforeIdentifier = `(?=${identifierStart})`;
const afterIdentifier = `(?<=${identifierContinue})`;
const identifier = `\\b${identifierStart}${identifierContinue}*\\b`;

const lineComment: MatchRule = {
  key: "line-comment",
  scope: "comment.line.double-slash.bicep",
  match: `//.*$`,
};

const blockComment: BeginEndRule = {
  key: "block-comment",
  scope: "comment.block.bicep",
  begin: `/\\*`,
  end: `\\*/`,
};

const comments: IncludeRule = {
  key: 'comments',
  patterns: [lineComment, blockComment],
};

const expression: IncludeRule = {
  key: "expression",
  patterns: [
    /* placeholder filled later due to cycle*/
  ],
};

const escapeChar: MatchRule = {
  key: "escape-character",
  scope: "constant.character.escape.bicep",
  match: `\\\\(u[0-9A-Fa-f]{6}|n|r|t|\\\\|'|\\\${)`,
};

const stringVerbatim: BeginEndRule = {
  key: "string-verbatim",
  scope: "string.quoted.multi.bicep",
  begin: `'''`,
  end: `'''`,
  patterns: [],
}

const stringSubstitution: BeginEndRule = {
  key: "string-literal-subst",
  scope: meta,
  begin: '(?<!\\\\)(\\${)',
  beginCaptures: {
    "1": { scope: "punctuation.definition.template-expression.begin.bicep" },
  },
  end: `(})`,
  endCaptures: {
    "1": { scope: "punctuation.definition.template-expression.end.bicep" },
  },
  patterns: [expression],
};

const stringLiteral: BeginEndRule = {
  key: "string-literal",
  scope: "string.quoted.single.bicep",
  begin: `'(?!(''))`,
  end: `'`,
  patterns: [
    escapeChar,
    stringSubstitution
  ],
};

const numericLiteral: MatchRule = {
  key: "numeric-literal",
  scope: "constant.numeric.bicep",
  match: `[0-9]+`,
};

const namedLiteral: MatchRule = {
  key: "named-literal",
  scope: "constant.language.bicep",
  match: `\\b(true|false|null)\\b`,
};

const identifierExpression: MatchRule = {
  key: "identifier",
  scope: "variable.other.readwrite.bicep",
  match: `${identifier}(?!\\s*\\()`,
};

const objectPropertyKeyIdentifier: MatchRule = {
  key: "object-property-key-identifier",
  scope: meta,
  match: `(${identifier})`,
  captures: {
    "1": { scope: "variable.other.property.bicep" },
  }
};

const objectPropertyStart: BeginEndRule = {
  key: "object-property-start",
  scope: meta,
  begin: `^\\s*`,
  end: `\\s*:`,
  patterns: [
    stringLiteral,
    objectPropertyKeyIdentifier,
  ],
};

const objectPropertyEnd: BeginEndRule = {
  key: "object-property-end",
  scope: meta,
  begin: `(?<=:)\\s*`,
  end: `\\s*$`,
  patterns: [expression],
};

const objectProperty: BeginEndRule = {
  key: "object-property",
  scope: meta,
  begin: `^(?!(\\s*}))`,
  end: `$`,
  patterns: [
    objectPropertyStart,
    objectPropertyEnd,
  ],
};

const objectLiteral: BeginEndRule = {
  key: "object-literal",
  scope: meta,
  begin: `{`,
  end: `}`,
  patterns: [objectProperty],
};

const arrayProperty: BeginEndRule = {
  key: "array-property",
  scope: meta,
  begin: `^(?!(\\s*\]))`,
  end: `$`,
  patterns: [expression],
};

const arrayLiteral: BeginEndRule = {
  key: "array-literal",
  scope: meta,
  begin: `\\[(?!(\\s*for\\b))`,
  end: `\\]`,
  patterns: [arrayProperty],
};

const forExpressionInStart: BeginEndRule = {
  key: "for-expression-in-start",
  scope: meta,
  begin: `\\b(?<=for)\\s*`,
  end: `\\b(in)\\b`,
  endCaptures: {
    "1": { scope: "keyword.control.declaration.bicep" },
  },
  patterns: [
    expression,
  ],
};

const forExpressionInEnd: BeginEndRule = {
  key: "for-expression-in-end",
  scope: meta,
  begin: `\\b(?<=in)\\s*`,
  end: `\\b(?=:)`,
  patterns: [
    expression,
  ],
};

const forExpressionIn: BeginEndRule = {
  key: "for-expression-in",
  scope: meta,
  begin: `\\b`,
  end: `:`,
  patterns: [
    forExpressionInEnd,
    forExpressionInStart,
  ],
};

const forExpressionEnd: BeginEndRule = {
  key: "for-expression-end",
  scope: meta,
  begin: `(?<=:)\\s*`,
  end: `\\s*(?=\\])`,
  patterns: [
    expression,
  ],
};

const forExpression: BeginEndRule = {
  key: "for-expression",
  scope: meta,
  begin: `\\[\\s*(for)\\b`,
  beginCaptures: {
    "1": { scope: "keyword.control.declaration.bicep" },
  },
  end: `\\]`,
  patterns: [
    forExpressionIn,
    forExpressionEnd,
  ],
};

const functionCall: BeginEndRule = {
  key: "function-call",
  scope: meta,
  begin: `\\b(${identifier})\\s*\\(`,
  beginCaptures: {
    "1": { scope: "entity.name.function.bicep" },
  },
  end: `\\)`,
  patterns: [
    expression,
  ],
};

const targetScopeStatement: BeginEndRule = {
  key: "targetscope-statement",
  scope: meta,
  begin: `\\b(targetScope)\\s+=\\s*`,
  beginCaptures: {
    "1": { scope: "keyword.control.declaration.bicep" },
  },
  end: `\\s*$`,
  patterns: [
    expression,
  ],
};

const paramStatement: BeginEndRule = {
  key: "param-statement",
  scope: meta,
  begin: `\\b(param)\\s+(${identifier})\\s+(${identifier})\\b`,
  beginCaptures: {
    "1": { scope: "keyword.control.declaration.bicep" },
    "2": { scope: "variable.name.bicep" },
    "3": { scope: "variable.name.bicep" },
  },
  end: `\\s*$`,
  patterns: [
    expression,
  ],
};

const resourceStatementEnd: BeginEndRule = {
  key: "resource-statement-end",
  scope: meta,
  begin: `(?<=')\\s*=\\s*((?={)|(?=\\[))`,
  end: `((?<=})|(?<=\\]))\\s*$`,
  patterns: [
    expression,
  ],
};

const resourceStatement: BeginEndRule = {
  key: "resource-statement",
  scope: meta,
  begin: `\\b(resource)\\s+(${identifier})\\s+(?=')`,
  beginCaptures: {
    "1": { scope: "keyword.control.declaration.bicep" },
    "2": { scope: "variable.name.bicep" },
  },
  end: `\\s*$`,
  patterns: [
    resourceStatementEnd,
    stringLiteral,
  ],
};

const moduleStatementEnd: BeginEndRule = {
  key: "module-statement-end",
  scope: meta,
  begin: `(?<=')\\s*=\\s*(?={)`,
  end: `(?<=})\\s*$`,
  patterns: [
    objectLiteral,
  ],
};

const moduleStatement: BeginEndRule = {
  key: "module-statement",
  scope: meta,
  begin: `\\b(module)\\s+(${identifier})\\s+(?=')`,
  beginCaptures: {
    "1": { scope: "keyword.control.declaration.bicep" },
    "2": { scope: "variable.name.bicep" },
  },
  end: `\\s*$`,
  patterns: [
    moduleStatementEnd,
    stringLiteral,
  ],
};

const varStatement: BeginEndRule = {
  key: "var-statement",
  scope: meta,
  begin: `\\b(var)\\s+(${identifier})\\s*=\\s*`,
  beginCaptures: {
    "1": { scope: "keyword.control.declaration.bicep" },
    "2": { scope: "variable.name.bicep" },
  },
  end: `\\s*$`,
  patterns: [
    expression,
  ],
};

const outputStatement: BeginEndRule = {
  key: "output-statement",
  scope: meta,
  begin: `\\b(output)\\s+(${identifier})\\s+(${identifier})\\s*=\\s*`,
  beginCaptures: {
    "1": { scope: "keyword.control.declaration.bicep" },
    "2": { scope: "variable.name.bicep" },
    "3": { scope: "variable.name.bicep" },
  },
  end: `\\s*$`,
  patterns: [
    expression,
  ],
};

const decorator: BeginEndRule = {
  key: "decorator",
  scope: meta,
  begin: `@`,
  end: `(?=\\s)`,
  patterns: [
    expression,
  ],
};

const statement: IncludeRule = {
  key: "statement",
  patterns: [
    comments,
    decorator,
    targetScopeStatement,
    paramStatement,
    resourceStatement,
    moduleStatement,
    varStatement,
    outputStatement,
  ],
};

expression.patterns = [
  identifierExpression,
  forExpression,
  stringLiteral,
  stringVerbatim,
  numericLiteral,
  namedLiteral,
  objectLiteral,
  arrayLiteral,
  functionCall,
];

const grammar: Grammar = {
  $schema: tm.schema,
  name: "Bicep",
  scopeName: "source.bicep",
  fileTypes: [".bicep"],
  patterns: [statement],
};

async function main() {
  const json = await tm.emitJSON(grammar);
  await fs.writeFile(grammarJson, json);
}

main().catch((err) => {
  console.log(err.stack);
  process.exit(1);
});