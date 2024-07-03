const moment = require('moment');
const base64 = require('base-64');
const axios = require('axios');
const config = require('../../config/index');
const log = require('../../../logging/index');
const helpers = require('../../helper/helper');
const cached = require('../caching/redis');

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;

/** 
 * Get Video form old sstv 
 * 1. Get data from sstv
 * 2. prepare data format
 * 3. caching
 */

async function getItemList(req) {

    var logName = helpers.setLogName(req.method, req.path, req.query);
    var cacheKey = helpers.generateCacheKey(req.path, req.query);

    var categoryId = req.query.categoryId;
    var requestPage = req.query.page;
    var results = {};


    // --- If client request first page, get data from caching
    var cachedData = await cached.get(cacheKey);
    
    // ถ้ามี cache อยู่ให้ return ข้อมูลที่เป็น cache เลย ถ้าไม่เจอก็ให้ไปดึงที่ database
    if (cachedData) {
        var data = JSON.parse(cachedData);
        results = {
            info: {
                dataSource: appMessage.dataSource.redis,
                cacheKey: cacheKey,
            },
            data: data.content
        }
        
        return results; 

    } else {

        // --- Get data from sstv api
        var result = await axios({
            method: 'get',
            url: config.sstv.url,
            params: {
                page: requestPage,
                idtss: categoryId
            }
        });

        if (helpers.isEmptyObject(result.data.body)) {
            throw {
                code: 400,
                message: 'Data not found'
            };
        }

        result.data.body.map((row) => {
            // modify date from dd/mm/yy to mm/dd/yy
            var d = row.lastupdate_date.split(/\//);
            var newDateFormat = [d[1], d[0], d[2] ].join('/');
 
            var cd = moment(newDateFormat).locale('th');
            var thaiYear = cd.year() + 543;
            row.custom_date = cd.format(`D MMMM ${thaiYear} HH:mm`);
            row.date_fromnow = cd.fromNow();
        });

        results = {
            info: {
                dataSource: 'sstv',
                cacheKey: cacheKey,
                cacheTtl: config.cacheTtl.category,
            },
            data: result.data.body
        };

        // --- save data to cache
        var data = {
            content: result.data.body
        }

        cached.set(cacheKey, config.cacheTtl.category, JSON.stringify(data))
            .then((result) => {
                results.info.cached = 'success'
            })
            .catch((error) => {
                results.info.cached = 'failed'
            })

        return results;
    }
 
}

// var deleteCache = (req) => {
//     return new Promise((resolve, reject) => {
//         cached.deleteByPath(base64.encode(req.path))
//         .then((result) => {
//             resolve(result);
//         })
//         .catch((error) => {
//             reject(error);
//         })
//     });
// };

module.exports = {
    getItemList
}