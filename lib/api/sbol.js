
let pug = require('pug');

const {fetchSBOLSource} = require('../fetch/fetch-sbol-source');

let serializeSBOL = require('../serializeSBOL');

let config = require('../config');

let getUrisFromReq = require('../getUrisFromReq');

const fs = require('mz/fs');

module.exports = function(req, res) {
  req.setTimeout(0); // no timeout

  const {graphUri, uri, designId, share} = getUrisFromReq(req, res);

  fetchSBOLSource(uri, graphUri).then((tempFilename) => {
    res.status(200).type('application/rdf+xml');
    // .set({ 'Content-Disposition': 'attachment; filename=' + collection.name + '.xml' })

    const readStream = fs.createReadStream(tempFilename);

    readStream.pipe(res).on('finish', () => {
      fs.unlink(tempFilename);
    });
  }).catch((err) => {
    if (req.url.endsWith('/sbol')) {
      return res.status(404).send(uri + ' not found');
    } else {
      let locals = {
        config: config.get(),
        section: 'errors',
        user: req.user,
        errors: [err.stack],
      };
      res.send(pug.renderFile('templates/views/errors/errors.jade', locals));
    }
  });
};


