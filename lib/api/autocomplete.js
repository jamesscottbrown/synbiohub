
const cache = require('../cache');

const ExecutionTimer = require('../util/execution-timer');

module.exports = function(req, res) {
let searchTimer = ExecutionTimer('search autocompletions');

res.send(JSON.stringify(cache.autocompleteTitle.get(req.params.query)));

searchTimer();
};

