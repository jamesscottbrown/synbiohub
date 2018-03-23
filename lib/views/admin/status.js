
let pug = require('pug');

const os = require('os');
const config = require('../../config');

module.exports = function(req, res) {
  let locals = {
    config: config.get(),
    section: 'admin',
    adminSection: 'status',
    user: req.user,
    nodeVersion: process.version,
    architecture: os.arch(),
    platform: os.type(),
    osRelease: os.release(),
    config: config.get(),
  };

  res.send(pug.renderFile('templates/views/admin/status.jade', locals));
};
