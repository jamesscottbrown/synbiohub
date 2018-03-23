let loadTemplate = require('./loadTemplate');
let escape = require('pg-escape');
let prefixify = require('./prefixify');
let config = require('./config');
const sparql = require('./sparql/sparql');

function search(graphUri, criteria, offset, limit, user) {
  let templateParams = {
    criteria: criteria,
    offset: offset !== undefined ? ' OFFSET ' + offset : '',
    limit: limit !== undefined ? ' LIMIT ' + limit : '',
    from: '',
  };
  if (user) {
    templateParams.from = 'FROM <' + config.get('databasePrefix')+'public>'
+ ' FROM <'+user.graphUri+'>';
  }

  let countQuery = loadTemplate('sparql/searchCount.sparql', templateParams);
  let searchQuery = loadTemplate('sparql/search.sparql', templateParams);

  console.log(countQuery);
  console.log(searchQuery);

  return Promise.all([

    sparql.queryJson(countQuery, graphUri).then((result) => {
      if (result && result[0] && result[0].count !== undefined) {
        return Promise.resolve(result[0].count);
      } else {
        return Promise.reject(new Error('could not get result count'));
      }
    }),

    sparql.queryJson(searchQuery, graphUri).then((results) => {
      return Promise.resolve(results.map((result) => {
        result.uri = result.subject;
        delete result.subject;

        if (result.name && result.name != '' && result.name != result.displayId) {
          result.name = result.name;
        } else {
          result.name = result.displayId;
        }

        let prefixedUri = prefixify(result.uri);
        result.url = '/'+result.uri.toString().replace(config.get('databasePrefix'), '');

        result.triplestore = 'public';
        result.prefix = prefixedUri.prefix;

        return result;
      }));
    }),

  ]).then((res) => {
    return Promise.resolve({
      count: res[0],
      results: res[1],
    });
  });
}

search.lucene = function lucene(value) {
  let criteriaStr = '';
  let values = value.split('&');
  if (value.indexOf('created') > -1) {
    criteriaStr += '   ?subject dcterms:created ?cdate . ';
  }
  if (value.indexOf('modified') > -1) {
    criteriaStr += '   ?subject dcterms:modified ?mdate . ';
  }
  for (var i = 0; i < values.length-1; i++) {
    let query = values[i].split('=');
    if (query[0].indexOf(':') > -1) {
      criteriaStr += '   ?subject ' + query[0] + ' ' + query[1] + ' . ';
    } else if (query[0]==='objectType') {
      criteriaStr += '   ?subject a sbol2:' + query[1] + ' . ';
    } else if (query[0]==='collection') {
      criteriaStr += '   ?collection a sbol2:Collection .' +
'   ' + query[1] + ' sbol2:member ?subject .';
    } else if (query[0]==='createdBefore') {
      criteriaStr += '   FILTER (xsd:dateTime(?cdate) <= \''+query[1]+'T23:59:59Z\'^^xsd:dateTime) ';
    } else if (query[0]==='createdAfter') {
      criteriaStr += '   FILTER (xsd:dateTime(?cdate) >= \''+query[1]+'T00:00:00Z\'^^xsd:dateTime) ';
    } else if (query[0]==='modifiedBefore') {
      criteriaStr += '   FILTER (xsd:dateTime(?mdate) <= \''+query[1]+'T23:59:59Z\'^^xsd:dateTime) ';
    } else if (query[0]==='modifiedAfter') {
      criteriaStr += '   FILTER (xsd:dateTime(?mdate) >= \''+query[1]+'T00:00:00Z\'^^xsd:dateTime) ';
    } else {
      criteriaStr += '   ?subject sbol2:' + query[0] + ' ' + query[1] + ' . ';
    }
  }
  if (values[values.length-1]!='') {
    let searchTerms = values[values.length-1].split(/[ ]+/);
    criteriaStr += 'FILTER (';
    let andMode = true;
    let notMode = false;
    for (var i = 0; i < searchTerms.length; i++) {
      if (searchTerms[i]==='and') {
        andMode = true;
        continue;
      } else if (searchTerms[i]==='or') {
        andMode = false;
        continue;
      } else if (searchTerms[i]==='not') {
        notMode = true;
        continue;
      }
      if (i > 0) {
        if (andMode) {
          criteriaStr += '&&';
          andMode = false;
        } else {
          criteriaStr += '||';
        }
      }
      if (notMode) {
        criteriaStr += ' !';
      }
      criteriaStr += escape(
        '(CONTAINS(lcase(?displayId), lcase(%L))||CONTAINS(lcase(?name), lcase(%L))||CONTAINS(lcase(?description), lcase(%L)))',
        searchTerms[i], searchTerms[i], searchTerms[i]
      );
    }
    criteriaStr += ')';
  }

  return criteriaStr;
};

module.exports = search;
