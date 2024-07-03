const validate = require("validate.js");
const tournament = require('./worldcup.js');
const config = require('../../../config/index');
const log = require('../../../../logging/index');

const responseData = config.response;

var getTables = (req, res) => {

    // เช็ค parameters ว่าเป็นตัวเลขหรือไม่
    if (
        validate({field: req.params.round}, {field: {numericality: true}})
    ) {
        return res.status(400).json(responseData(400, 'fail', 'invalid request', null));
    }

    var group = req.query.group ? req.query.group : 'all';

    var requestInfo = {
        method: req.method,
        path: req.path,
        query: {
            group
        }      
    }

    //return res.json(responseData(200, 'success', null, requestInfo));
    return tournament.getTables(requestInfo)
        .then((result) => {
            return res.json(responseData(200, 'success', result.info, result.data));
        })
        .catch((error) => {
            if (error.code) {
                return res.status(error.code).json(responseData(error.code, 'fail', {'error': error.message}, null))
            }
            return res.status(500).json(responseData(500, 'fail', {'error': error.code}, null))
        });

}

var deleteCache = (req, res) => {

    return tournament.deleteCache(req)
        .then((result) => {
            if (result == 0) {
                return res.json(responseData(204, 'fail', 'no key found or key already deleted.', null));
            }
            return res.json(responseData(200, 'success', 'deleted keys: '+result, null));
        })
        .catch((error) => {
            return res.status(500).json(responseData(500, 'fail', {'error': error}, null))
        });
}

module.exports = {
    getTables,
    deleteCache
}