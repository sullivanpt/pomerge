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

var _ = require('lodash');
var pofile = require('pofile');

// remove windows cr-lf if present and split on new-lines
function splitLines(s) {
  return s.replace(/\r\n/g, '\n').split('\n');
}

// angular-gettext retains and keys off of newlines, but translations should not care
function normalizeKey(key) {
  return key.replace(/\r\n */g, ' ');
}

// was the item translation left empty
function itemEmpty(elt) {
  return elt.msgstr.length < 1 || // probably an error actually
    (elt.msgstr.length === 1 && elt.msgstr[0] === "");
}

// was the item explicitly translated as the same word (which shouldn't have been done)
function itemTranslatedUnchanged(elt) {
  return elt.msgstr.length === 1 && elt.msgstr[0] === elt.msgid;
}

/**
 * Language header is updated with options.language if present
 * msgid and msgstr are matched and mergeFrom takes priority (unless options.keepTemplate)
 *
 * template file is otherwise preserved, read as fs.readFileSync(templatePath, 'utf8'));
 * mergeFrom is not changed
 * returns {
 *   stats: object with merge statistics
 *   template reference to modified template
 * }
 */
exports.pomerge = function pomerge(options, templateString, mergeFromString) {
  var template = pofile.parse(templateString);
  var mergeFrom = pofile.parse(mergeFromString);

  var mergeFromMap = mergeFrom.items.reduce(function (prev, elt) {
    return prev.set(normalizeKey(elt.msgid), elt);
  }, new Map());

  var stats = {
    templateReplaced: [], // items in the template file that got replaced by merge file
    templateMissed: [], // items in template that didn't change
    mergeMissed: [], // items in the merge file that were not used
    mergeSkipped: [], // items in merge file not used because the template item was kept
    translateSame: [], // items remaining in output that have explicit translations to the same value (should be none)
    untranslated: [] // items remaining in output that have no translation
  };

  template.items.forEach(function (elt) {
    var mergeFromElt = mergeFromMap.get(normalizeKey(elt.msgid));
    if (mergeFromElt) {
      mergeFromElt.used = true;
      if (itemEmpty(mergeFromElt)) {
        // not translated in merge file might not be an issue, we'll catch it below if it is
      } else if (options.keepTemplate && !itemEmpty(elt)) {
        stats.mergeSkipped.push(elt.msgid);
      } else if (itemTranslatedUnchanged(mergeFromElt)) {
        stats.translateSame.push(elt.msgid);
      } else {
        stats.templateReplaced.push(elt.msgid);
        elt.msgstr = mergeFromElt.msgstr;
      }
    } else {
      stats.templateMissed.push(elt.msgid);
    }
    if (itemEmpty(elt)) {
      stats.untranslated.push(elt.msgid);
    }
  });

  mergeFrom.items.forEach(function (elt) {
    if (!elt.used) {
      stats.mergeMissed.push(elt.msgid);
    }
  });

  if (options.language) {
    template.headers.Language = options.language;
  }
  template.headers['X-Generator'] = 'po-merge';

  stats.templateMissed.sort();
  stats.mergeMissed.sort();

  return {
    stats: stats,
    merged: template.toString()
  };
};
