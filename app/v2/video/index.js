const validate = require("validate.js");
const sstv = require('./ssvideo');
const config = require('../../config/index');
const log = require('../../../logging/index');

const responseData = config.response;

var sstvList = (req, res) => {
    /*
    1 => 'premierleague',
    2 => 'championship',
    3 => 'calcio',
    4 => 'bundesliga',
    5 => 'laliga',
    6 => 'ligue1',
    12 => 'champions-league',
    13 => 'europa-league',
    24 => 'fa-cup',
    25 => 'league-cup',
    26 => 'copa-del-rey',
    27 => 'coppa-Italia',
    28 => 'dfb-pokal',
    29 => 'coupe-de-france',
    30 => 'coupe-de-la-ligue',
    66 => 'otherleague',
    70 => 'national',
			213 => 'worldcup2018'
    */
    
    var categoryId = req.query.catId;
    var page = req.query.page;

    var requestInfo = {
        method: req.method,
        path: req.path,
        id: req.params.id,
        query: {
            categoryId,
            page
        }        
    }

    return sstv.getItemList(requestInfo)
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

// // GET list ชื่อ โปรแกรมทั้งหมด
// var getList = (req, res) => {

//     return list.getList()
//         .then((result) => {
//             return res.json(responseData(200, 'success', result.info, result.data));
//         })
//         .catch((error) => {
//             if (error.code) {
//                 return res.status(400).json(responseData(400, 'fail', {'error': error.message}, null))
//             }
//             return res.status(500).json(responseData(500, 'fail', {'error': error.code}, null))
//         });
// }

// var getItemList = (req, res) => {

//     var requestPage = 0;
//     var itemPerPage = 10;

//     if (!req.query.siteId) {
//         return res.status(400).json(responseData(400, 'fail', 'please specific site id', null));
//     }

//     // เช็ค parameters ว่าเป็นตัวเลขหรือไม่
//     if (
//         validate({field: req.params.id}, {field: {numericality: true}}) ||
//         validate({field: req.query.page}, {field: {numericality: true}}) ||
//         validate({field: req.query.items}, {field: {numericality: true}})
//     ) {
//         return res.status(400).json(responseData(400, 'fail', 'invalid request', null));
//     }

//     var siteId = req.query.siteId;
//     var requestPage = req.query.page && req.query.page > 1 ? req.query.page : 0;
//     var itemPerPage = req.query.items ? req.query.items : 10;

//     var requestInfo = {
//         method: req.method,
//         path: req.path,
//         id: req.params.id,
//         query: {
//             siteId,
//             items: itemPerPage,
//             page: requestPage
//         }        
//     }

//     return itemList.getItemList(requestInfo)
//         .then((result) => {
//             return res.json(responseData(200, 'success', result.info, result.data));
//         })
//         .catch((error) => {
//             if (error.code) {
//                 return res.status(error.code).json(responseData(error.code, 'fail', {'error': error.message}, null))
//             }
//             return res.status(500).json(responseData(500, 'fail', {'error': error.code}, null))
//         });

// } 

// var getByOrder = (req, res) => {

//     var requestPage = 0;
//     var itemPerPage = 10;

//     if (!req.query.siteId) {
//         return res.status(400).json(responseData(400, 'fail', 'please specific site id', null));
//     }

//     // เช็ค parameters ว่าเป็นตัวเลขหรือไม่
//     if (
//         validate({field: req.query.page}, {field: {numericality: true}}) ||
//         validate({field: req.query.items}, {field: {numericality: true}})
//     ) {
//         return res.status(400).json(responseData(400, 'fail', 'invalid request', null));
//     }

//     var siteId = req.query.siteId;
//     var requestPage = req.query.page && req.query.page > 1 ? req.query.page : 0;
//     var itemPerPage = req.query.items ? req.query.items : 10;

//     var requestInfo = {
//         method: req.method,
//         path: req.path,
//         query: {
//             siteId,
//             items: itemPerPage,
//             page: requestPage,
//             order: req.params.order
//         }        
//     }

//     return itemList.getByOrder(requestInfo)
//         .then((result) => {
//             return res.json(responseData(200, 'success', result.info, result.data));
//         })
//         .catch((error) => {
//             if (error.code) {
//                 return res.status(error.code).json(responseData(error.code, 'fail', {'error': error.message}, null))
//             }
//             return res.status(500).json(responseData(500, 'fail', {'error': error.code}, null))
//         });

// }

// var deleteCache = (req, res) => {

//     return itemList.deleteCache(req)
//         .then((result) => {
//             if (result == 0) {
//                 return res.json(responseData(204, 'fail', 'no key found or key already deleted.', null));
//             }
//             return res.json(responseData(200, 'success', 'deleted keys: '+result, null));
//         })
//         .catch((error) => {
//             return res.status(500).json(responseData(500, 'fail', {'error': error}, null))
//         });
// }

module.exports = {
    sstvList
}