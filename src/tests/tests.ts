import { readdirSync } from 'fs';
import { readFile, writeFile, stat } from 'fs/promises';
import { parse as parseYaml } from 'yamljs';
import { IOnigLib, IToken, parseRawGrammar, Registry, StackElement } from 'vscode-textmate';
import { createOnigScanner, createOnigString, loadWASM } from 'vscode-oniguruma';
import path, { dirname, basename, extname } from 'path';
import plist from 'plist';
import { expect } from 'chai';

const jsonPath = `${__dirname}/../../bicep.tmlanguage.json`;
const ymlPath = `${__dirname}/../../bicep.grammar.yml`;
const baselinesDir = `${__dirname}/baselines`;

async function createOnigLib(): Promise<IOnigLib> {
  const onigWasm = await readFile(`${path.dirname(require.resolve('vscode-oniguruma'))}/onig.wasm`);

  await loadWASM(onigWasm.buffer);

  return {
    createOnigScanner: sources => createOnigScanner(sources),
    createOnigString,
  };
}

const registry = new Registry({
  onigLib: createOnigLib(),
  loadGrammar: async scopeName => {
    const jsonContents = await readFile(jsonPath, { encoding: 'utf-8' });
    const grammar = JSON.parse(jsonContents);

    return parseRawGrammar(plist.build(grammar));    
  }
});

async function getTokensByLine(content: string) {
  const grammar = await registry.loadGrammar('source.bicep');
  if (!grammar) {
    throw `Grammar initialization failed!`;
  }

  const lines = content.split(/\r\n|\r|\n/);
  const tokensByLine: IToken[][] = [];

  let ruleStack: StackElement | null = null;
  for (const line of lines) {
    const result = grammar.tokenizeLine(line, ruleStack);

    ruleStack = result.ruleStack
    tokensByLine.push(result.tokens);
  }

  return lines.map((line, i) => ({
    line,
    tokens: tokensByLine[i],
  }));
}

async function writeBaseline(filePath: string, ignoreMetadata: boolean) {
  const baselineBaseName = basename(filePath, extname(filePath));
  const baselineFilePath = path.join(dirname(filePath), `${baselineBaseName}.tokens`);

  let diffBefore = '';
  const bicepFile = await readFile(filePath, { encoding: 'utf-8' });
  try {
    diffBefore = await readFile(baselineFilePath, { encoding: 'utf-8' });
  } catch {} // ignore and create the baseline file anyway

  let baseline = '';
  const tokensByLine = await getTokensByLine(bicepFile);
  const maxLineLength = Math.max(...tokensByLine.map(x => x.line.length));

  for (const { line, tokens } of tokensByLine) {
    baseline += `  ${line}\n`;
    for (const token of tokens) {
      let scopes = token.scopes;
      if (ignoreMetadata) {
        scopes = scopes.filter(x => !x.startsWith('meta.') && x !== 'source.bicep');
      }

      if (scopes.length < 1) {
        continue;
      }

      baseline += '//';
      baseline += ' '.repeat(token.startIndex);
      baseline += '~'.repeat(token.endIndex - token.startIndex);
      baseline += ' '.repeat(maxLineLength + 2 - token.endIndex);
      baseline += scopes.join(', ');
      baseline += '\n';
    }
  }

  const diffAfter = baseline;
  await writeFile(baselineFilePath, baseline, { encoding: 'utf-8' });

  return {
    diffBefore,
    diffAfter,
    baselineFilePath,
  };
}

const baselineFiles = readdirSync(baselinesDir)
  .filter(p => extname(p) === '.bicep')
  .map(p => path.join(baselinesDir, p));

for (const filePath of baselineFiles) {
  describe(filePath, () => {
    let result = {
      baselineFilePath: '',
      diffBefore: '',
      diffAfter: ''
    };

    before(async () => {
      result = await writeBaseline(filePath, true);
    });

    it('Comparing baselines', () => {
      expect(result.diffBefore).to.equal(result.diffAfter, `Baseline diff failed. Updated baseline '${result.baselineFilePath}'.`);
    });
  });
}