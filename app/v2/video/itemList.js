const moment = require('moment');
const config = require('../../../config/index');
const log = require('../../../logging/index');
const helpers = require('../../../helper/helper');
const cached = require('../caching/redis');
const base64 = require('base-64');
const db = require('../database/mysql');

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;

function getFirstPageCached (page, cacheKey) {
    var cachedData = null;

    return new Promise((resolve, reject) => {
        if( page === 0) {
            cached.get(cacheKey)
                .then((result) => {
                    if (result) {
                        cachedData = result;
                    }
                    resolve(cachedData);
                })
        } else {
            resolve(cachedData);
        }
    })   
}

async function getItemList(req) {

    var logName = helpers.setLogName(req.method, req.path, req.query);
    var cacheKey = helpers.generateCacheKey(req.path, req.query);

    var categoryId = req.id;
    var siteId = req.query.siteId;
    var requestPage = req.query.page;
    var itemPerPage = req.query.items;
    var totalRows = 0;
    var totalPages = 0;
    var results = {};


    // --- If client request first page, get data from caching
    var cachedData = await getFirstPageCached(requestPage, cacheKey);
    
    
    // ถ้ามี cache อยู่ให้ return ข้อมูลที่เป็น cache เลย ถ้าไม่เจอก็ให้ไปดึงที่ database
    if (cachedData) {
        var data = JSON.parse(cachedData);
        results = {
            info: {
                dataSource: appMessage.dataSource.redis,
                cacheKey: cacheKey,
                listInfo: data.description
            },
            data: data.content
        }
        
        return results; 

    } else {

        // --- Get data from database
        var queryTotalRows = `
            SELECT count(*) as totalRows
            FROM sstv_video
            WHERE program_id = ${categoryId}
            AND site_id = ${siteId}
            AND status = 1
            AND approve = 1
            AND video_status = 1
            AND flag = 1
        `;

        var result = await db.read(queryTotalRows);

        if(result[0].totalRows === 0) {
            throw {
                code: 404,
                message: 'Data not found.'
            };
        }

        totalRows = result[0].totalRows;
        totalPages = (Math.ceil(totalRows / itemPerPage))
        var startLimit = 0;

        if (requestPage > totalPages) {
            throw {
                code: 400,
                message: 'page request is more than total page.'
            };
        }

        if (requestPage > 1) {
            startLimit = (itemPerPage * requestPage) - itemPerPage;
        }

        var queryItems  = `
            SELECT v.video_id as id, v.site_id, v.program_id, v.video_title as title, v.countview as view,
                v.video_path, v.video_file, v.ref_id, v.video_type,
                v.countshare as share, v.lastupdated_date, v.approve_date, v.created_date,
                p.file_path, p.folder, p.file_name,
                g.program_name, g.program_name_en
            FROM sstv_video as v
            LEFT JOIN sstv_picture as p ON v.video_id = p.ref_id
            LEFT JOIN sstv_program as g ON v.program_id = g.program_id
            WHERE v.program_id = ${categoryId}
            AND v.site_id = ${siteId}
            AND v.status = 1
            AND v.approve = 1
            AND v.video_status = 1
            AND v.flag = 1
            ORDER BY v.approve_date DESC 
            LIMIT ${startLimit}, ${itemPerPage}`;

        var listItem = await db.read(queryItems);
    
        var listInfo = {
            total_rows: totalRows,
            total_page: totalPages,
        }

        var responseData = [];

        listItem.map((row) => {
            var cd = moment(row.lastupdated_date).locale('th');
            var thaiYear = cd.year() + 543;
            row.custom_date = cd.format(`D MMMM ${thaiYear} HH:mm`);
            row.date_fromnow = cd.fromNow();
            row.link_video = `${config.upload_path.video}${row.video_path}/${row.video_file}`;
            row.thumbnails = {
                default: `${config.upload_path.imgDefault}${row.folder}/${row.file_name}`,
                size128: `${config.upload_path.imgSize128}${row.folder}/${row.file_name}`,
                size224: `${config.upload_path.imgSize224}${row.folder}/${row.file_name}`,
                size304: `${config.upload_path.imgSize304}${row.folder}/${row.file_name}`,
                size640: `${config.upload_path.imgSize640}${row.folder}/${row.file_name}`,
            }

            responseData.push({
                id: row.id,
                site_id: row.site_id,
                program_id: row.program_id,
                video_type: row.video_type,
                ref_id: row.ref_id,
                title: row.title,
                program_name: row.program_name,
                program_name_en: row.program_name_en,
                view: row.view,
                share: row.share,
                lastupdated_date: row.lastupdated_date,
                approve_date: row.approve_date,
                created_date: row.created_date,
                custom_date: row.custom_date,
                date_fromnow: row.date_fromnow,
                link_video: row.link_video,
                thumbnails: row.thumbnails
            })
        })

        results = {
            info: {
                dataSource: appMessage.dataSource.mysql,
                cacheKey: cacheKey,
                cacheTtl: config.cacheTtl.category,
                listInfo
            },
            data: responseData
        };

        // --- save only first page to cache
        if ( requestPage === 0) {
            var data = {
                description: listInfo,
                content: responseData
            }
            cached.set(cacheKey, config.cacheTtl.category, JSON.stringify(data))
                .then((result) => {
                    results.info.cached = 'success'
                })
                .catch((error) => {
                    results.info.cached = 'failed'
                })
        }


        return results;
    }
 
}

async function getByOrder(req) {

    var logName = helpers.setLogName(req.method, req.path, req.query);
    var cacheKey = helpers.generateCacheKey(req.path, req.query);

    var siteId = req.query.siteId;
    var categoryId = req.id;
    var requestPage = req.query.page;
    var itemPerPage = req.query.items;
    var order = req.query.order;
    var totalRows = 0;
    var totalPages = 0;
    var results = {};
    var orderBy = '';


    // --- If client request first page, get data from caching
    var cachedData = await getFirstPageCached(requestPage, cacheKey);
    
    // ถ้ามี cache อยู่ให้ return ข้อมูลที่เป็น cache เลย ถ้าไม่เจอก็ให้ไปดึงที่ database
    if (cachedData) {
        var data = JSON.parse(cachedData);
        results = {
            info: {
                dataSource: appMessage.dataSource.redis,
                cacheKey: cacheKey,
                listInfo: data.description
            },
            data: data.content
        }
        
        return results; 

    } else {

        // --- Get data from database
        var queryTotalRows = `
            SELECT count(*) as totalRows
            FROM sstv_video
            WHERE status = 1
            AND site_id = ${siteId}
            AND approve = 1
            AND video_status = 1
            AND flag = 1
        `;

        var result = await db.read(queryTotalRows);

        if(result[0].totalRows === 0) {
            throw {
                code: 404,
                message: 'Data not found.'
            };
        }

        totalRows = result[0].totalRows;
        totalPages = (Math.ceil(totalRows / itemPerPage))
        var startLimit = 0;

        if (requestPage > totalPages) {
            throw {
                code: 400,
                message: 'page request is more than total page.'
            };
        }

        if (requestPage > 1) {
            startLimit = (itemPerPage * requestPage) - itemPerPage;
        }

        if (order == 'topview') {
            orderBy = 'ORDER BY view DESC, v.approve_date DESC';
        } else if (order == 'latest') {
            orderBy = 'ORDER BY v.approve_date DESC'
        } else {
            throw {
                code: 400,
                message: 'wrong order requested.'
            };
        }

        var queryItems  = `
            SELECT v.video_id as id, v.site_id, v.program_id, v.video_title as title, v.countview as view,
                v.video_path, v.video_file, v.ref_id, v.video_type,
                v.countshare as share, v.lastupdated_date, v.approve_date, v.created_date,
                p.file_path, p.folder, p.file_name,
                g.program_name, g.program_name_en
            FROM sstv_video as v
            LEFT JOIN sstv_picture as p ON v.video_id = p.ref_id
            LEFT JOIN sstv_program as g ON v.program_id = g.program_id
            WHERE v.status = 1
            AND v.site_id = ${siteId}
            AND v.approve = 1
            AND v.video_status = 1
            AND v.flag = 1
            ${orderBy}
            LIMIT ${startLimit}, ${itemPerPage}`;

        var listItem = await db.read(queryItems);
    
        var listInfo = {
            total_rows: totalRows,
            total_page: totalPages,
        }

        var responseData = [];

        listItem.map((row) => {
            var cd = moment(row.approve_date).locale('th');
            var thaiYear = cd.year() + 543;
            row.custom_date = cd.format(`D MMMM ${thaiYear} HH:mm`);
            row.date_fromnow = cd.fromNow();
            row.link_video = `${config.upload_path.video}${row.video_path}/${row.video_file}`;
            row.thumbnails = {
                default: `${config.upload_path.imgDefault}${row.folder}/${row.file_name}`,
                size128: `${config.upload_path.imgSize128}${row.folder}/${row.file_name}`,
                size224: `${config.upload_path.imgSize224}${row.folder}/${row.file_name}`,
                size304: `${config.upload_path.imgSize304}${row.folder}/${row.file_name}`,
                size640: `${config.upload_path.imgSize640}${row.folder}/${row.file_name}`,
            }

            responseData.push({
                id: row.id,
                site_id: row.site_id,
                program_id: row.program_id,
                video_type: row.video_type,
                ref_id: row.ref_id,
                title: row.title,
                program_name: row.program_name,
                program_name_en: row.program_name_en,
                view: row.view,
                share: row.share,
                lastupdated_date: row.lastupdated_date,
                approve_date: row.approve_date,
                created_date: row.created_date,
                custom_date: row.custom_date,
                date_fromnow: row.date_fromnow,
                link_video: row.link_video,
                thumbnails: row.thumbnails
            })
        })

        results = {
            info: {
                dataSource: appMessage.dataSource.mysql,
                cacheKey: cacheKey,
                cacheTtl: config.cacheTtl.category,
                listInfo
            },
            data: responseData
        };

        // --- save only first page to cache
        if ( requestPage === 0) {
            var data = {
                description: listInfo,
                content: responseData
            }
            cached.set(cacheKey, config.cacheTtl.category, JSON.stringify(data))
                .then((result) => {
                    results.info.cached = 'success'
                })
                .catch((error) => {
                    results.info.cached = 'failed'
                })
        }


        return results;
    }
   
}

var deleteCache = (req) => {
    return new Promise((resolve, reject) => {
        cached.deleteByPath(base64.encode(req.path))
        .then((result) => {
            resolve(result);
        })
        .catch((error) => {
            reject(error);
        })
    });
};

module.exports = {
    getItemList,
    getByOrder,
    deleteCache
}