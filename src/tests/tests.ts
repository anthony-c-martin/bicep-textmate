import { readdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { parse as parseYaml } from 'yamljs';
import { IOnigLib, IToken, parseRawGrammar, Registry, StackElement } from 'vscode-textmate';
import { createOnigScanner, createOnigString, loadWASM } from 'vscode-oniguruma';
import path, { dirname, basename, extname } from 'path';
import plist from 'plist';
import { expect } from 'chai';

const ymlPath = `${__dirname}/../../bicep.grammar.yml`;
const baselinesDir = `${__dirname}/baselines`;

async function createOnigLib(): Promise<IOnigLib> {
  const onigWasm = await readFile(path.resolve(`${require.resolve('vscode-oniguruma')}/../onig.wasm`));

  await loadWASM(onigWasm.buffer);

  return {
    createOnigScanner: sources => createOnigScanner(sources),
    createOnigString,
  };
}

const registry = new Registry({
  onigLib: createOnigLib(),
  loadGrammar: async scopeName => {
    const ymlContents = await readFile(ymlPath, { encoding: 'utf-8' });
    const grammar = parseYaml(ymlContents);

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

const baselineFiles = readdirSync(baselinesDir)
  .filter(p => extname(p) === '.bicep')
  .map(p => path.join(baselinesDir, p));


for (const filePath of baselineFiles) {
  describe(filePath, () => {
    const baselineBaseName = basename(filePath, extname(filePath));
    const baselineFilePath = path.join(dirname(filePath), `${baselineBaseName}.tokens`);

    let diffBefore : string | undefined;
    let diffAfter: string | undefined;

    before(async () => {
      const bicepFile = await readFile(filePath, { encoding: 'utf-8' });
      diffBefore = await readFile(baselineFilePath, { encoding: 'utf-8' });

      let baseline = '';
      const tokensByLine = await getTokensByLine(bicepFile);
      const maxLineLength = Math.max(...tokensByLine.map(x => x.line.length));

      for (const { line, tokens } of tokensByLine) {
        baseline += `  ${line}\n`;
        for (const token of tokens) {
          baseline += '//';
          baseline += ' '.repeat(token.startIndex);
          baseline += '~'.repeat(token.endIndex - token.startIndex);
          baseline += ' '.repeat(maxLineLength - token.endIndex);
          baseline += ` ${token.scopes.join(', ')}`;
          baseline += '\n';
        }
      }
  
      diffAfter = baseline;
      await writeFile(baselineFilePath, baseline, { encoding: 'utf-8' });
    });

    it('Comparing baselines', () => {
      expect(diffAfter).to.equal(diffBefore);
    });
  });
}