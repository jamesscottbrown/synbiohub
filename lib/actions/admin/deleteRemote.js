
const config = require('../../config');

module.exports = function(req, res) {
  const remoteId = req.body.id;
  let remotes = config.get('remotes');

  delete remotes[remoteId];

  config.set('remotes', remotes);
  res.redirect('/admin/remotes');
};
