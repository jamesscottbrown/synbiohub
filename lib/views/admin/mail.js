
const pug = require('pug');
const config = require('../../config');
const createUser = require('../../createUser');
const sendCreatePasswordMail = require('../../mail/createPassword');
let extend = require('xtend');
const uuidV4 = require('uuid/v4');
let sha1 = require('sha1');

module.exports = function(req, res) {
if (req.method === 'POST') {
post(req, res);
} else {
form(req, res, {});
}
};


function form(req, res, locals) {
let mail = config.get('mail');

locals = extend({
config: config.get(),
section: 'admin',
adminSection: 'theme',
user: req.user,
sendGridApiKey: mail.sendgridApiKey,
sendGridFromEmail: mail.fromAddress,
}, locals);

res.send(pug.renderFile('templates/views/admin/mail.jade', locals));
}

function post(req, res) {
if (!req.body.key) {
return form(req, res, {
registerAlert: 'Please enter the SendGrid API Key',
});
}

if (!req.body.fromEmail) {
return form(req, res, {
registerAlert: 'Please enter the SendGrid From email',
});
}

let mail = {};
mail.sendgridApiKey = req.body.key;
mail.fromAddress = req.body.fromEmail;
config.set('mail', mail);

res.redirect('/admin/mail/');
}


