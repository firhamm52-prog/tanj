import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { format } from 'sql-formatter';

const check = process.argv.includes('--check');
const config = {
  language: 'postgresql',
  keywordCase: 'upper',
  tabWidth: 2,
  linesBetweenQueries: 1,
};

// Keep quoted literals and comments opaque, including JSON and function bodies.
function lex(source) {
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    const rest = source.slice(offset);
    const match =
      /^(\s+|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|[A-Za-z_][\w$]*|\d+(?:\.\d+)?|::|:=|[+*\/<>=~!@#%^&|?\-]+|.)/.exec(
        rest,
      );
    if (!match) throw Error('SQL token tidak dikenali.');
    let text = match[0];
    const delimiter = /^\$[A-Za-z_0-9]*\$/.exec(rest)?.[0];
    if (delimiter) {
      const end = source.indexOf(delimiter, offset + delimiter.length);
      if (end < 0) throw Error('Dollar quote SQL belum ditutup.');
      text = source.slice(offset, end + delimiter.length);
    }
    tokens.push(text);
    offset += text.length;
  }
  return tokens;
}

const isComment = (token) => token.startsWith('--') || token.startsWith('/*');
const proceduralKeywords = new Set([
  'DECLARE',
  'BEGIN',
  'END',
  'IF',
  'ELSIF',
  'ELSE',
  'THEN',
  'RAISE',
  'EXCEPTION',
  'PERFORM',
  'RETURN',
  'LOOP',
  'FOREACH',
  'RETURNS',
  'LANGUAGE',
  'SECURITY',
  'DEFINER',
  'STABLE',
  'IMMUTABLE',
  'TRIGGER',
  'EACH',
  'ROW',
  'EXECUTE',
]);
const uppercaseProcedural = (source) =>
  lex(source)
    .map((token) => (proceduralKeywords.has(token.toUpperCase()) ? token.toUpperCase() : token))
    .join('');
function compact(tokens) {
  const keywords = new Set([
    ...proceduralKeywords,
    'NOT',
    'NULL',
    'OR',
    'AND',
    'IN',
    'IS',
    'DISTINCT',
    'FROM',
    'TRUE',
    'FALSE',
    'FOR',
    'WHILE',
    'SELECT',
    'ARRAY',
    'EXISTS',
  ]);
  let result = '',
    previous = '';
  for (const value of tokens) {
    const token = keywords.has(value.toUpperCase()) ? value.toUpperCase() : value;
    const tight =
      ['.', ')', ',', ';', '::', ']'].includes(token) ||
      ['.', '(', '::', '['].includes(previous) ||
      (token === '(' && /^[A-Za-z_]\w*$/.test(previous) && !keywords.has(previous));
    result += (result && !tight ? ' ' : '') + token;
    previous = token;
  }
  return result;
}
function signature(source) {
  return lex(source)
    .filter((t) => !/^\s+$/.test(t) && !isComment(t))
    .map((token) => {
      if (token.startsWith("'")) {
        const value = token.slice(1, -1).replaceAll("''", "'");
        try {
          const json = JSON.parse(value);
          if (typeof json === 'object') return ['json', json];
        } catch {}
        return ['literal', value];
      }
      if (token.startsWith('$')) {
        const delimiter = /^\$\w*\$/.exec(token)?.[0];
        if (delimiter) {
          const value = token.slice(delimiter.length, -delimiter.length);
          try {
            return ['json', JSON.parse(value)];
          } catch {
            return ['body', signature(value)];
          }
        }
      }
      return token.startsWith('"') ? token : token.toLowerCase();
    });
}

function procedure(source) {
  const tokens = lex(source).filter((t) => !/^\s+$/.test(t));
  const lines = [];
  let chunk = [],
    level = 0,
    parentheses = 0,
    cases = 0,
    declaring = false,
    control = '';
  const emit = (value) => {
    const cleaned = value.trim();
    if (cleaned)
      for (const line of cleaned.split('\n'))
        lines.push('  '.repeat(Math.max(0, level)) + line.trimEnd());
  };
  const flush = () => {
    if (!chunk.length) return;
    const text = compact(chunk).trim();
    let formatted = text;
    if (!control) formatted = uppercaseProcedural(format(text, config));
    emit(formatted);
    chunk = [];
  };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i],
      word = token.toUpperCase(),
      next = tokens[i + 1]?.toUpperCase();
    if (isComment(token)) {
      flush();
      emit(token);
      continue;
    }
    if (token.startsWith("'") || token.startsWith('"')) {
      chunk.push(token);
      continue;
    }
    if (word === 'CASE') cases++;
    else if (word === 'END' && cases) {
      cases--;
      chunk.push(token);
      continue;
    }
    if (!parentheses && !cases) {
      if (word === 'DECLARE') {
        flush();
        emit('DECLARE');
        level++;
        declaring = true;
        continue;
      }
      if (word === 'BEGIN') {
        flush();
        if (declaring) level--;
        emit('BEGIN');
        level++;
        declaring = false;
        continue;
      }
      if (word === 'END') {
        flush();
        level--;
        const suffix = next === 'IF' || next === 'LOOP' ? ' ' + tokens[++i].toUpperCase() : '';
        if (tokens[i + 1] === ';') i++;
        emit('END' + suffix + ';');
        control = '';
        continue;
      }
      if (word === 'ELSE' || word === 'ELSIF') {
        flush();
        level--;
        if (word === 'ELSE') {
          emit('ELSE');
          level++;
          continue;
        }
        control = 'if';
        chunk.push('ELSIF');
        continue;
      }
      if (!chunk.length && word === 'IF') control = 'if';
      if (!chunk.length && ['FOR', 'FOREACH', 'WHILE'].includes(word)) control = 'loop';
      if (word === 'THEN' && control === 'if') {
        chunk.push('THEN');
        flush();
        level++;
        control = '';
        continue;
      }
      if (word === 'LOOP' && control === 'loop') {
        chunk.push('LOOP');
        flush();
        level++;
        control = '';
        continue;
      }
    }
    if (token === '(') parentheses++;
    if (token === ')') parentheses--;
    chunk.push(word === 'IF' ? 'IF' : token);
    if (token === ';') {
      flush();
      control = '';
    }
  }
  flush();
  return lines.join('\n');
}

function formatSql(source, dialect) {
  let formatted = source.replace(
    /(\bAS\s+|\bDO\s+)(\$\w*\$)([\s\S]*?)\2/gi,
    (_, prefix, delimiter, body) => {
      const content = /^\s*(DECLARE|BEGIN)\b/i.test(body) ? procedure(body) : format(body, config);
      return prefix + delimiter + '\n' + content + '\n' + delimiter;
    },
  );
  // Pretty-print the CMS seed as JSON, preserving its parsed value exactly.
  formatted = lex(formatted)
    .map((token) => {
      if (!token.startsWith("'") || token.length < 1000) return token;
      try {
        const value = JSON.parse(token.slice(1, -1).replaceAll("''", "'"));
        if (!value || typeof value !== 'object') return token;
        const pretty = JSON.stringify(value, null, 2);
        if (pretty.includes('$cms_seed$')) return token;
        return '$cms_seed$\n' + pretty + '\n$cms_seed$';
      } catch {
        return token;
      }
    })
    .join('');
  formatted =
    uppercaseProcedural(format(formatted, { ...config, language: dialect })).trimEnd() + '\n';
  assert.deepEqual(signature(formatted), signature(source), 'Formatter mengubah token SQL.');
  return formatted;
}

let changed = 0;
for (const directory of ['database', 'supabase']) {
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith('.sql')) {
        const source = await readFile(file, 'utf8');
        const output = formatSql(source, directory === 'database' ? 'sqlite' : 'postgresql');
        if (output !== source) {
          changed++;
          if (check) console.error(file);
          else await writeFile(file, output);
        }
      }
    }
  }
  await walk(directory);
}
if (check && changed) process.exitCode = 1;
console.log(
  check ? `SQL format check: ${changed} file perlu dirapikan.` : `SQL formatted: ${changed} file.`,
);
