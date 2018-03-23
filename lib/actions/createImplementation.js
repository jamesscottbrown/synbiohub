
var async = require('async');

var request = require('request');

var loadTemplate = require('../loadTemplate');

var config = require('../config');

var getUrisFromReq = require('../getUrisFromReq');
var splitUri = require('../splitUri');

var sparql = require('../sparql/sparql');

module.exports = function(req, res) {

    req.setTimeout(0); // no timeout

    const { graphUri, uri, designId, baseUri } = getUrisFromReq(req, res);

    var implementationId = req.params.displayId  + '_build';
    var implementationVersion = '1';
    var implementationPersistentIdentity = baseUri + '/' + implementationId;
    var implementationUri = implementationPersistentIdentity + '/' + implementationVersion;

    const userUri = config.get('databasePrefix') + 'user/' + req.user.username;

    var templateParams = {
        uri: sparql.escapeIRI(implementationUri),
        persistentIdentity: sparql.escapeIRI(implementationPersistentIdentity),
        displayId: JSON.stringify(implementationId),
        version: JSON.stringify(implementationVersion),
        implementationOf: sparql.escapeIRI(uri),
        ownedBy: userUri
    };


    var query = loadTemplate('sparql/CreateImplementation.sparql', templateParams);

	sparql.updateQuery(query, graphUri).then((r) => {

            console.log(r);
            res.redirect('/'+implementationUri.replace(config.get('databasePrefix'),''));
        
    }).catch((err) => {

        res.status(500).send(err.stack);
                
    });
};
