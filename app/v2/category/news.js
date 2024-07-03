const moment = require('moment');
const base64 = require('base-64');

const config = require('../../config/index');
const log = require('../../../logging/index');
const helpers = require('../../helper/helper');
const cached = require('../caching/redis');
const MySqlClass = require('../database/mysql.class');

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;

const db = new MySqlClass(config.SS_MYSQL_CONNECTION_POOL);

// promise function for get content picture
function getContentPicture(data) {
  return new Promise((resolve, reject) => {
    // prepare query promise iterate in data
    var queryNewsPicture = data.map(row => {
      var ref_type = 1;

      var queryNewsPicture = `
                SELECT folder, file_name
                FROM ss_picture
                WHERE ref_id = ${row.news_id}
                AND ref_type = ${ref_type};
            `;

      return db.read(queryNewsPicture).then(picturePath => {
        var pictureFolder = picturePath[0]['folder'];
        var pictureName = picturePath[0]['file_name'];

        row.picture_size = {
          fullsize: `${row.types}/${pictureFolder}/${pictureName}`,
          size128: `${
            config.siamsport_upload_path.imgSize128
          }${pictureFolder}/${pictureName}`,
          size224: `${
            config.siamsport_upload_path.imgSize224
          }${pictureFolder}/${pictureName}`,
          size304: `${
            config.siamsport_upload_path.imgSize304
          }${pictureFolder}/${pictureName}`,
          size640: `${
            config.siamsport_upload_path.imgSize640
          }${pictureFolder}/${pictureName}`
        };

        return row;
      });
    });

    // run all iterate promise in data
    Promise.all(queryNewsPicture).then(completed => {
      resolve(completed);
    });
  });
}

function getFirstPageCached(page, cacheKey) {
  var cachedData = null;

  return new Promise((resolve, reject) => {
    if (page === 0) {
      cached.get(cacheKey).then(result => {
        if (result) {
          cachedData = result;
        }
        resolve(cachedData);
      });
    } else {
      resolve(cachedData);
    }
  });
}

async function getItemList(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);

  var by = req.by;
  var id = req.id;
  var order = req.query.order;
  var requestPage = req.query.page;
  var itemPerPage = req.query.items;
  var totalRows = 0;
  var totalPages = 0;
  var results = {};
  var field = '';

  // --- If cached, get data from caching
  var cachedData = await cached.get(cacheKey);

  // ถ้ามี cache อยู่ให้ return ข้อมูลที่เป็น cache เลย ถ้าไม่เจอก็ให้ไปดึงที่ database
  if (cachedData) {
    var data = JSON.parse(cachedData);
    results = {
      info: {
        dataSource: appMessage.dataSource.redis,
        cacheKey: cacheKey
      },
      data: data.content
    };

    return results;
  } else {
    // --- Get data from database
    if (by === 'tournament') {
      field = 'tournament_id';
    }

    // count total rows
    var queryTotalRows = `
        SELECT count(*) as totalRows
        FROM ss_news
        WHERE ${field} = ${id}
        AND status = 1
        AND approve = 1
        AND lang='th'
        `;

    var result = await db.read(queryTotalRows);

    if (result[0].totalRows === 0) {
      throw {
        code: 404,
        message: 'Data not found.'
      };
    }

    totalRows = result[0].totalRows;
    totalPages = Math.ceil(totalRows / itemPerPage);

    var startLimit = 0;

    if (requestPage > totalPages) {
      throw {
        code: 400,
        message: 'page request is more than total page.'
      };
    }

    if (requestPage > 1) {
      startLimit = itemPerPage * requestPage - itemPerPage;
    }

    var orderBy = 'ORDER BY ss_n.approve_date DESC';

    if (order === 'topview') {
      orderBy = 'ORDER BY ss_n.countview DESC, ss_n.approve_date DESC';
    }

    var queryItems = `SELECT ss_n.news_id2 as news_id, ss_n.icon_pic, ss_n.icon_vdo, ss_n.title,
                    ss_n.lastupdate_date, ss_n.countview, ss_n.share, ss_n.approve_date, ss_n.start_date, ss_n.expire_date,
                    ss_n.countview, ss_n.share, ss_n.icon_pic, ss_n.icon_vdo,
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
                    WHERE ss_n.${field} = ${id}
                    AND ss_p.ref_type = 1
                    AND ss_p.default = 1
                    AND ss_n.status = 1
                    AND ss_n.approve = 1
                    AND ss_n.lang='th'
                    ${orderBy}
                    LIMIT ${startLimit}, ${itemPerPage}`;

    var listItem = await db.read(queryItems);

    if (helpers.isEmptyObject(listItem)) {
      throw {
        code: 400,
        message: 'data not found.'
      };
    }

    // Set custom datetime
    listItem.map(row => {
      row.types = 'news';
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
    content.map(row => {
      isPublish = helpers.checkPublish(row.start_date, row.expire_date);

      if (isPublish) {
        responseData.push({
          news_id: row.news_id,
          types: row.types,
          title: row.title,
          thumbnail: row.thumbnail,
          lastupdate_date: row.lastupdate_date,
          approve_date: row.approve_date,
          start_date: row.start_date,
          expire_date: row.expire_date,
          view: row.countview,
          share: row.share,
          icon_pic: row.icon_pic,
          icon_vdo: row.icon_vdo,
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

    var listInfo = {
      total_rows: totalRows,
      total_page: totalPages
    };

    results = {
      info: {
        dataSource: appMessage.dataSource.mysql,
        cacheKey: cacheKey,
        cacheTtl: config.cacheTtl.category,
        listInfo
      },
      data: responseData
    };

    // --- save data to cache
    var data = {
      content: responseData
    };

    cached
      .set(cacheKey, config.cacheTtl.category, JSON.stringify(data))
      .then(result => {
        results.info.cached = 'success';
      })
      .catch(error => {
        results.info.cached = 'failed';
      });

    return results;
  }
}

var deleteCache = req => {
  return new Promise((resolve, reject) => {
    cached
      .deleteByPath(base64.encode(req.path))
      .then(result => {
        resolve(result);
      })
      .catch(error => {
        reject(error);
      });
  });
};

module.exports = {
  getItemList,
  deleteCache
};
