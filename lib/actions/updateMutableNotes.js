
const pug = require('pug');

const sparql = require('../sparql/sparql');

const loadTemplate = require('../loadTemplate');

const config = require('../config');

const getGraphUriFromTopLevelUri = require('../getGraphUriFromTopLevelUri');

const wiky = require('../wiky/wiky');

const getOwnedBy = require('../query/ownedBy');

module.exports = function(req, res) {
const uri = req.body.uri;

const graphUri = getGraphUriFromTopLevelUri(uri, req.user);

const notes = req.body.value;

let notesSparql = '';
if (notes.trim() != '') {
notesSparql = '<' + uri + '> sbh:mutableNotes ' + JSON.stringify(notes) + ' .';
}

let d = new Date();
let modified = d.toISOString();
modified = modified.substring(0, modified.indexOf('.'));

const updateQuery = loadTemplate('./sparql/UpdateMutableNotes.sparql', {
topLevel: uri,
notes: notesSparql,
modified: JSON.stringify(modified),
});

getOwnedBy(uri, graphUri).then((ownedBy) => {
if (ownedBy.indexOf(config.get('databasePrefix') + 'user/' + req.user.username) === -1) {
res.status(401).send('not authorized to edit this submission');
return;
}

return sparql.updateQuery(updateQuery, graphUri).then((result) => {
const locals = {
config: config.get(),
src: notes,
notes: notes!=''?wiky.process(notes, {}):'',
canEdit: true,
};

res.send(pug.renderFile('templates/partials/mutable-notes.jade', locals));
});
});
};


