
const pug = require('pug');

const loadTemplate = require('../loadTemplate');

const getUrisFromReq = require('../getUrisFromReq');

const config = require('../config');

const getGraphUriFromTopLevelUri = require('../getGraphUriFromTopLevelUri');

const multiparty = require('multiparty');

const uploads = require('../uploads');

const attachments = require('../attachments');

const streamToString = require('stream-to-string');

const {fetchSBOLObjectRecursive} = require('../fetch/fetch-sbol-object-recursive');

const SBOLDocument = require('sboljs');

let sparql = require('../sparql/sparql-collate');

const getOwnedBy = require('../query/ownedBy');

module.exports = function(req, res) {
  let attachmentObjects = [];

  const form = new multiparty.Form();

  const {graphUri, uri, designId, share, url, baseUri} = getUrisFromReq(req, res);

  getOwnedBy(uri, graphUri).then((ownedBy) => {
    if (ownedBy.indexOf(config.get('databasePrefix') + 'user/' + req.user.username) === -1) {
      return res.status(401).send('not authorized to edit this submission');
    }

    form.on('part', (partStream) => {
      if (partStream.filename) {
        uploads.createUpload(partStream).then((uploadInfo) => {
          const {hash, size} = uploadInfo;

          return attachments.addAttachmentToTopLevel(
            graphUri, baseUri, uri, partStream.filename, hash, size,
            attachments.getTypeFromExtension(partStream.filename), req.user.username);
        }).then(() => {
		    let templateParams = {
            uri: uri,
		    };

		    let getAttachmentsQuery = loadTemplate('sparql/GetAttachments.sparql', templateParams);

		    return Promise.all([
            sparql.queryJson(getAttachmentsQuery, graphUri).then((results) => {
			    attachmentList = results;

			    return attachments.getAttachmentsFromList(graphUri, attachmentList).then((results) => {
                attachmentObjects = results;
			    });
            }),
		    ]);
        }).then(() => {
          const locals = {
            config: config.get(),
            canEdit: true,
            url: url,
            attachments: attachmentObjects,
          };

          res.send(pug.renderFile('templates/partials/attachments.jade', locals));
        }).catch((err) => {
          res.status(500).send(err.stack);
        });
	    }
    });

    form.on('error', (err) => {
      res.status(500).send(err);
    });

    form.parse(req);
  });
};


