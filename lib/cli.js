/**
 * Utility to merge one PO file into another
 *
 * Example:
 *   $ node po-merge.js es path-to-template.po path-to-merge-from.po
 *   Will write es.po and es.po-merge
 *   Language header is updated.
 *   msgid and msgstr are matched.
 *   template file is otherwise preserved
 */
'use strict';

var fs = require('fs');
var pomerge = require('./pomerge');

// process.env.argv = [ node script.js arg1 arg2 ... ]
var language = (process.argv[2] || '').trim();
var templatePath = (process.argv[3] || '').trim();
var mergeFromPath = (process.argv[4] || '').trim();

if (!language || language.length !== 2 || !templatePath || !mergeFromPath) {
  console.log('Usage: node po-merge.js <language-iso-2> <template-path> <source-path>');
  process.exit(1);
}

var templateString = fs.readFileSync(templatePath, 'utf8');
var mergeFromString = fs.readFileSync(mergeFromPath, 'utf8');

var result = pomerge.pomerge({
  language: language
}, templateString, mergeFromString);

result.stats.files = `${language} ${templatePath} ${mergeFromPath}`;

fs.writeFileSync(language + '.po', result.merged);
fs.writeFileSync(language + '.po-merge', JSON.stringify(result.stats, null, 2));

console.log(`unused ${result.stats.mergeMissed.length}\nsame ${result.stats.translateSame.length}\nuntranslated ${result.stats.untranslated.length}`);
