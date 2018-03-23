var pug = require('pug');

const { fetchSBOLObjectRecursive } = require('../fetch/fetch-sbol-object-recursive');

var serializeSBOL = require('../serializeSBOL');

var config = require('../config');

var getUrisFromReq = require('../getUrisFromReq');

const uploads = require('../uploads');

module.exports = function(req, res) {

    const { graphUri, uri, designId, share } = getUrisFromReq(req, res);

    fetchSBOLObjectRecursive(uri, graphUri).then((result) => {

        const sbol = result.sbol;
        const object = result.object;

        const attachmentType = object.getAnnotation('http://wiki.synbiohub.org/wiki/Terms/synbiohub#attachmentType');
        const attachmentHash = object.getAnnotation('http://wiki.synbiohub.org/wiki/Terms/synbiohub#attachmentHash');

        const readStream = uploads.createCompressedReadStream(attachmentHash);

        const mimeType = config.get('attachmentTypeToMimeType')[attachmentType] || 'application/octet-stream';

        res.status(200);
        res.header('Content-Encoding', 'gzip');
        res.header('Content-Disposition', 'attachment; filename=\'' + object.name + '\'');
        res.type(mimeType);
        readStream.pipe(res);

    }).catch((err) => {

        return res.status(500).send(err.stack);

    });

};


