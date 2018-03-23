let pug = require('pug');

let search = require('../search');

let config = require('../config');

let iceSearch = require('../query/remote/ice/collection');

module.exports = function(req, res) {
function objValues(obj) {
return Object.keys(obj).map((key) => obj[key]);
}

if (req.params.query) {
console.log('query:' + req.params.query);

let collection = '';
let values = req.params.query.split('&');

for (let i = 0; i < values.length - 1; i++) {
let query = values[i].split('=');
if (query[0] === 'collection') {
collection = query[1].replace('<', '').replace('>', '');
}
}

let usedRemote = false;

if (collection != '') {
objValues(config.get('remotes')).map((remoteConfig) => {
console.log('collection = ' + collection);
if ((collection === config.get('databasePrefix') + 'public/' + remoteConfig.id + '/available/current' || collection.indexOf(config.get('databasePrefix') + 'public/' + remoteConfig.id + '/' + remoteConfig.folderPrefix) !== -1) && remoteConfig.type === 'ice') {
usedRemote = true;
iceSearch.getCollectionMembers(remoteConfig, collection).then((entries) => {
res.header('content-type', 'application/json').send(JSON.stringify(entries));
}).catch((err) => {
res.status(500).send(err.stack);
});
}
});
}

if (usedRemote) {
return;
}
}

if (req.query.q) {
if (req.query.q.toString().startsWith('/?offset')) {
return res.redirect('/search/*' + req.query.q);
} else {
return res.redirect('/search/' + encodeURIComponent(req.query.q));
}
}

let limit = 50;

if (req.query.limit) {
limit = req.query.limit;
}

let criteria = [];

if (req.params.query && req.params.query != '*') {
criteria.push(search.lucene(req.params.query));
}

if (req.originalUrl.toString().endsWith('/uses')) {
var designId;
var uri;

if (req.params.userId) {
designId = req.params.collectionId + '/' + req.params.displayId + '/' + req.params.version;
uri = config.get('databasePrefix') + 'user/' + encodeURIComponent(req.params.userId) + '/' + designId;
} else {
designId = req.params.collectionId + '/' + req.params.displayId + '/' + req.params.version;
uri = config.get('databasePrefix') + 'public/' + designId;
}

criteria.push(
' { ?subject ?p <' + uri + '> } UNION { ?subject ?p ?use . ?use ?useP <' + uri + '> } .'
+ ' FILTER(?useP != <http://wiki.synbiohub.org/wiki/Terms/synbiohub#topLevel>)'
);
}

if (req.originalUrl.toString().endsWith('/twins')) {
var designId;
var uri;
if (req.params.userId) {
designId = req.params.collectionId + '/' + req.params.displayId + '/' + req.params.version;
uri = config.get('databasePrefix') + 'user/' + encodeURIComponent(req.params.userId) + '/' + designId;
} else {
designId = req.params.collectionId + '/' + req.params.displayId + '/' + req.params.version;
uri = config.get('databasePrefix') + 'public/' + designId;
}
criteria.push(
'   ?subject sbol2:sequence ?seq .' +
'   ?seq sbol2:elements ?elements .' +
'   <' + uri + '> a sbol2:ComponentDefinition .' +
'   <' + uri + '> sbol2:sequence ?seq2 .' +
'   ?seq2 sbol2:elements ?elements2 .' +
'   FILTER(?subject != <' + uri + '> && ?elements = ?elements2)'
);
}

// if(req.user)
// criteria.createdBy = req.user;

// type, storeUrl, query, callback

let locals = {
config: config.get(),
section: 'search',
user: req.user,
};

search(null, criteria, req.query.offset, limit, req.user).then((searchRes) => {
const count = searchRes.count;
const results = searchRes.results;

if (req.originalUrl.indexOf('/searchCount') !== -1) {
res.header('content-type', 'text/plain').send(count.toString());
} else if (req.forceNoHTML || !req.accepts('text/html')) {
let jsonResults = results.map(function(result) {
return {
type: result['type'] || '',
uri: result['uri'] || '',
name: result['name'] || '',
description: result['description'] || '',
displayId: result['displayId'] || '',
version: result['version'] || '',
};
});
res.header('content-type', 'application/json').send(jsonResults);
} else {
locals.numResultsTotal = count;

locals.section = 'search';
locals.searchQuery = req.params.query === '*' ? '' : req.params.query;
locals.searchResults = results;
locals.limit = limit;

if (req.originalUrl.indexOf('/?offset') !== -1) {
locals.originalUrl = req.originalUrl.substring(0, req.originalUrl.indexOf('/?offset'));
} else {
locals.originalUrl = req.originalUrl;
}

if (req.query.offset) {
locals.firstResultNum = parseInt(req.query.offset) + 1;
if (count < parseInt(req.query.offset) + results.length) {
locals.lastResultNum = count;
} else {
locals.lastResultNum = parseInt(req.query.offset) + results.length;
}
} else {
locals.firstResultNum = 1;
if (count < results.length) {
locals.lastResultNum = count;
} else {
locals.lastResultNum = results.length;
}
}

if (results.length === 0) {
locals.firstResultNum = 0;
}

res.send(pug.renderFile('templates/views/search.jade', locals));
}
}).catch((err) => {
let locals = {
config: config.get(),
section: 'errors',
user: req.user,
errors: [err],
};

res.send(pug.renderFile('templates/views/errors/errors.jade', locals));
});
};
