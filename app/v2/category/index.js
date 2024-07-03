const validate = require("validate.js");
const news = require('./news');
const column = require('./column');
const config = require('../../config/index');
const log = require('../../../logging/index');

const responseData = config.response;

var getItemList = (req, res) => {

    // เช็ค parameters ว่าเป็นตัวเลขหรือไม่
    if (
        validate({field: req.query.page}, {field: {numericality: true}}) ||
        validate({field: req.query.items}, {field: {numericality: true}}) ||
        validate({field: req.params.id}, {field: {numericality: true}})
    ) {
        return res.status(400).json(responseData(400, 'fail', 'invalid request', null));
    }

    var type = req.params.type;
    var by = req.params.by;
    var id = req.params.id;

    var order = req.query.orderBy ? req.query.orderBy : 'latest';
    var requestPage = req.query.page && req.query.page > 1 ? req.query.page : 0;
    var itemPerPage = req.query.items ? req.query.items : 10;

    var requestInfo = {
        method: req.method,
        path: req.path,
        type,
        by,
        id,
        query: {
            items: itemPerPage,
            page: requestPage,
            order
        }        
    }

    //var results = news.getItemList(requestInfo);

    var results = null;

    if (type === 'news') {
        results = news.getItemList(requestInfo);
    } else {
        results = column.getItemList(requestInfo);
    }

    results
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

    var results = null;

    if (req.type === 'news') {
        results = news.deleteCache(req)
    } else {
        results = column.deleteCache(req)
    }

    results
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
    getItemList,
    deleteCache
}