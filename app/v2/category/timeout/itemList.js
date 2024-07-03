const moment = require('moment');
const base64 = require('base-64');

const config = require('../../../config/index');
const log = require('../../../../logging/index');
const helpers = require('../../../helper/helper');
const cached = require('../../caching/redis');
const MySqlClass = require('../../database/mysql.class');

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;

const db = new MySqlClass(config.SS_MYSQL_CONNECTION_POOL);

// promise function for get content picture
function getContentPicture(data) {

    return new Promise((resolve, reject) => {

        // prepare query promise iterate in data
        var queryNewsPicture = data.map( (row) => {

            var ref_type = 1;

            if(row.types === 'vdo') {
                ref_type = 4;
            } else if (row.types === 'column') {
            ref_type = 2;
            }

            var queryNewsPicture = `
                SELECT folder, file_name
                FROM ss_picture
                WHERE ref_id = ${row.news_id}
                AND ref_type = ${ref_type};
            `

            return db.read(queryNewsPicture)
                    .then((picturePath) => {

                        var pictureFolder = picturePath[0]['folder'];
                        var pictureName = picturePath[0]['file_name'];

                        row.picture_size = {
                            fullsize: `${row.types}/${pictureFolder}/${pictureName}`,
                            size128: `${config.siamsport_upload_path.imgSize128}${pictureFolder}/${pictureName}`,
                            size224: `${config.siamsport_upload_path.imgSize224}${pictureFolder}/${pictureName}`,
                            size304: `${config.siamsport_upload_path.imgSize304}${pictureFolder}/${pictureName}`,
                            size640: `${config.siamsport_upload_path.imgSize640}${pictureFolder}/${pictureName}`,
                        }

                        return row;
                    })

        });
        
        // run all iterate promise in data
        Promise.all(queryNewsPicture)
            .then((completed) => {

                resolve(completed);

            });
        
    });

}

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

async function getHighlight(req) {

    var logName = helpers.setLogName(req.method, req.path, req.query);
    var cacheKey = helpers.generateCacheKey(req.path, req.query);

    var results = {};

    // --- If cached, get data from caching
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

        var queryItems = `
        SELECT hn.news_id, sn.news_special_id, ss_ns.name as news_special_name, ss_ns.url as news_special_url,
        hn.types, hn.title, hn.description, hn.thumbnail, sn.lastupdate_date, sn.approve_date,
        sn.start_date, sn.expire_date, hc.name as category_name,
        st.tournament_id, st.tournament_name_th, st.tournament_name_en,
        st.url as tournament_url, st.dimension as tournament_dimension,
        st.domain as domain,
        ss.url as sport_url, ss.dimension as sport_dimension,
        ss.sport_id, ss.sport_name_th, ss.sport_name_en
        FROM ss_highlight_timeout_news hn
        LEFT JOIN ss_highlight_category hc
            ON hn.highlight_category_id = hc.highlight_category_id
        LEFT JOIN ss_news sn
            ON hn.news_id = sn.news_id2
        LEFT JOIN ss_tournament st
            ON sn.tournament_id = st.tournament_id
        LEFT JOIN ss_sport ss
            ON sn.sport_id = ss.sport_id
        LEFT JOIN ss_news_special ss_ns 
            ON sn.news_special_id = ss_ns.news_special_id
        WHERE hn.status = 1
        AND sn.approve = 1
        ORDER BY hn.order_by, sn.approve_date DESC;
        `;

        var listItem = await db.read(queryItems);

        if (helpers.isEmptyObject(listItem)) {
            throw {
                code: 400,
                message: 'timeout highlight data not found.'
            };
        }

        // Set custom datetime
        listItem.map( (row) => {

            var cd = moment(row.approve_date).locale('th');
            var thaiYear = cd.year() + 543;
            row.custom_date = cd.format(`D MMMM ${thaiYear} HH:mm`);
            row.date_fromnow = cd.fromNow();
        });

        // get content picture
        var content = await getContentPicture(listItem);

        var responseData = [];
        var isPublish = false;

        // check publish date on each items
        content.map( (row) => {

            isPublish = helpers.checkPublish(row.start_date, row.expire_date);

            if (isPublish) {
                responseData.push({
                    news_id: row.news_id,
                    news_special_id: row.news_special_id,
                    news_special_name: row.news_special_name,
                    news_special_url: row.news_special_url,
                    types: row.types,
                    title: row.title,
                    description: row.description,
                    thumbnail: row.thumbnail,
                    lastupdate_date: row.lastupdate_date,
                    approve_date: row.approve_date,
                    start_date: row.start_date,
                    expire_date: row.expire_date,
                    category_name: row.category_name,
                    tournament_id: row.tournament_id,
                    tournament_name_th: row.tournament_name_th,
                    tournament_name_en: row.tournament_name_en,
                    tournament_url: row.tournament_url,
                    tournament_dimension: row.tournament_dimension,
                    domain: row.domain,
                    sport_url: row.sport_url,
                    sport_dimension: row.sport_dimension,
                    sport_id: row.sport_id,
                    sport_name_th: row.sport_name_th,
                    sport_name_en: row.sport_name_en,
                    custom_date: row.custom_date,
                    date_fromnow: row.date_fromnow,
                    picture_size: row.picture_size
                });
            }

        });

        results = {
            info: {
                dataSource: appMessage.dataSource.mysql,
                cacheKey: cacheKey,
                cacheTtl: config.cacheTtl.category,
            },
            data: responseData
        }

        // --- save data to cache
        var data = {
            content: responseData
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

async function getByOrder(req) {

    var logName = helpers.setLogName(req.method, req.path, req.query);
    var cacheKey = helpers.generateCacheKey(req.path, req.query);

    var sportId = req.query.sportId;
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
            FROM ss_news
            WHERE status = 1
            AND sport_id = ${sportId}
            AND approve = 1
            AND status = 1
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
            orderBy = 'ORDER BY ss_n.countview DESC, ss_n.approve_date DESC';
        } else if (order == 'latest') {
            orderBy = 'ORDER BY ss_n.approve_date DESC'
        } else {
            throw {
                code: 400,
                message: 'wrong order requested.'
            };
        }

        var queryItems = `SELECT ss_n.news_id2 as news_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title,
                  ss_n.lastupdate_date, ss_n.countview, ss_n.share, ss_n.approve_date, ss_n.start_date, ss_n.expire_date,
                  ss_t.tournament_id, ss_t.tournament_name_th, ss_t.tournament_name_en, ss_t.domain,
                  ss_s.sport_id, ss_s.sport_name_th, ss_s.sport_name_en,
                  ss_t.url as tournament_url, ss_t.dimension as tournament_dimension,
                  ss_s.url as sport_url, ss_s.dimension as sport_dimension,
                  ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type
                  FROM ss_news ss_n
                  LEFT JOIN ss_tournament ss_t
                  ON ss_n.tournament_id = ss_t.tournament_id
                  LEFT JOIN ss_sport ss_s
                  ON ss_n.sport_id = ss_s.sport_id
                  LEFT JOIN ss_picture ss_p
                  ON ss_n.news_id2 = ss_p.ref_id
                  WHERE ss_n.sport_id = ${sportId}
                  AND ss_p.ref_type = 1
                  AND ss_p.default = 1
                  AND ss_n.status = 1
                  AND ss_n.approve = 1
                  ${orderBy}
                  LIMIT ${startLimit}, ${itemPerPage}`;

        var listItem = await db.read(queryItems);
    
        var listInfo = {
            total_rows: totalRows,
            total_page: totalPages,
        }

        var responseData = [];
        var isPublish = false;

        listItem.map((row) => {
            var types = 'news';
            var cd = moment(row.approve_date).locale('th');
            var thaiYear = cd.year() + 543;
            row.custom_date = cd.format(`D MMMM ${thaiYear} HH:mm`);
            row.date_fromnow = cd.fromNow();

            row.picture_size = {
                fullsize: `${types}/${row.folder}/${row.file_name}`,
                size128: `${config.siamsport_upload_path.imgSize128}${row.folder}/${row.file_name}`,
                size224: `${config.siamsport_upload_path.imgSize224}${row.folder}/${row.file_name}`,
                size304: `${config.siamsport_upload_path.imgSize304}${row.folder}/${row.file_name}`,
                size640: `${config.siamsport_upload_path.imgSize640}${row.folder}/${row.file_name}`,
            }

            isPublish = helpers.checkPublish(row.start_date, row.expire_date);

            if (isPublish) {

                responseData.push({
                    types,
                    news_id: row.news_id,
                    icon_pic: row.icon_pic,
                    icon_vdo: row.icon_vdo,
                    title: row.title,
                    lastupdate_date: row.lastupdate_date,
                    start_date: row.start_date,
                    expire_date: row.expire_date,
                    countview: row.countview,
                    share: row.share,
                    tournament_id: row.tournament_id,
                    tournament_name_th: row.tournament_name_th,
                    tournament_name_en: row.tournament_name_en,
                    sport_name_th: row.sport_name_th,
                    sport_name_en: row.sport_name_en,
                    tournament_url: row.tournament_url,
                    tournament_dimension: row.tournament_dimension,
                    sport_url: row.sport_url,
                    sport_dimension: row.sport_dimension,
                    folder: row.folder,
                    file_name: row.file_name,
                    picture_type: row.picture_type,
                    picture_size: row.picture_size
                });

            }
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
    getHighlight,
    getByOrder,
    deleteCache
}