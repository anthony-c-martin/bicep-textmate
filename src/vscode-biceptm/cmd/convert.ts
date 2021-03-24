import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
const YAML = require('yamljs');

const ymlPath = `${__dirname}/../../../bicep.grammar.yml`;
const jsonPath = `${__dirname}/../dist/bicep.grammar.json`;

const ymlFile = readFileSync(ymlPath, 'utf-8');
const object = YAML.parse(ymlFile);

mkdirSync(dirname(jsonPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(object, null, 2));