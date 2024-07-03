const validate = require("validate.js");
const itemList = require('./itemList');
const config = require('../../../config/index');
const log = require('../../../../logging/index');

const responseData = config.response;

var getHighlight = (req, res) => {
    /*
        category
        Timeout = 76 (sport_id)

        Subcategory (condition sport_id = 76)
        Timeout = 219 (tournament_id)
        Health = 221 (tournament_id)
        Tech = 222 (tournament_id)
        Activities = 223 (tournament_id)
        Style = 224 (tournament_id)
    */

    var requestInfo = {
        method: req.method,
        path: req.path
    };


    return itemList.getHighlight(requestInfo)
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

var getByOrder = (req, res) => {

    var requestPage = 0;
    var itemPerPage = 10;

    // เช็ค parameters ว่าเป็นตัวเลขหรือไม่
    if (
        validate({field: req.query.page}, {field: {numericality: true}}) ||
        validate({field: req.query.items}, {field: {numericality: true}})
    ) {
        return res.status(400).json(responseData(400, 'fail', 'invalid request', null));
    }

    var requestPage = req.query.page && req.query.page > 1 ? req.query.page : 0;
    var itemPerPage = req.query.items ? req.query.items : 10;

    var requestInfo = {
        method: req.method,
        path: req.path,
        query: {
            sportId: 76,
            items: itemPerPage,
            page: requestPage,
            order: req.params.order
        }        
    }

    return itemList.getByOrder(requestInfo)
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

    return itemList.deleteCache(req)
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
    getHighlight,
    getByOrder,
    deleteCache
}