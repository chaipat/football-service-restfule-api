const moment = require("moment");
const base64 = require("base-64");

const config = require("../../config/index");
const log = require("../../../logging/index");
const helpers = require("../../helper/helper");
const cached = require("../caching/redis");
const MySqlClass = require("../database/mysql.class");

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;

const db = new MySqlClass(config.SS_MYSQL_CONNECTION_POOL);

// promise function for get content picture
function getContentPicture(data) {
  return new Promise((resolve, reject) => {
    // prepare query promise iterate in data
    var queryNewsPicture = data.map(row => {
      var ref_type = 2;

      var queryNewsPicture = `
                SELECT folder, file_name
                FROM ss_picture
                WHERE ref_id = ${row.column_id}
                AND ref_type = ${ref_type};
            `;

      return db.read(queryNewsPicture).then(picturePath => {
        var pictureFolder = picturePath[0]["folder"];
        var pictureName = picturePath[0]["file_name"];

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
  var field = "";

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
    if (by === "tournament") {
      field = "tournament_id";
    }

    // count total rows
    var queryTotalRows = `
        SELECT count(*) as totalRows
        FROM ss_column
        WHERE ${field} = ${id}
        AND status = 1
        AND approve = 1
        AND lang='th'
        `;

    var result = await db.read(queryTotalRows);

    if (result[0].totalRows === 0) {
      throw {
        code: 404,
        message: "Data not found."
      };
    }

    totalRows = result[0].totalRows;
    totalPages = Math.ceil(totalRows / itemPerPage);

    var startLimit = 0;

    if (requestPage > totalPages) {
      throw {
        code: 400,
        message: "page request is more than total page."
      };
    }

    if (requestPage > 1) {
      startLimit = itemPerPage * requestPage - itemPerPage;
    }

    var orderBy = "ORDER BY ss_column.approve_date DESC";

    if (order === "topview") {
      orderBy =
        "ORDER BY ss_column.countview DESC, ss_column.approve_date DESC";
    }

    var queryItems = `SELECT DISTINCT ss_column.column_id2 as column_id, ss_column.match_id, ss_column.profile_id, ss_column.sport_id, 
            ss_column.tournament_id, ss_column.micro_id, ss_column.icon_pic, ss_column.icon_vdo, ss_column.lang, 
            ss_column.columnist_id, columnist.name as columnist_name, columnist.alias as columnist_alias, columnist.avatar as columnist_avatar, 
            ss_column.title, ss_column.embed_script, ss_column.keyword, ss_column.shorturl, ss_column.redirect_url, 
            ss_column.can_comment, ss_column.rate18_flag, ss_column.countview, ss_column.share, ss_column.create_date, ss_column.approve_date,
            ss_column.start_date, ss_column.expire_date,
            ss_column.lastupdate_date, ss_column.order_by, ss_highlight_news_mapping.types, picture.ref_type as picture_type, picture.folder, picture.file_name, 
            tournament.tournament_name_th, tournament.tournament_name_en, tournament.url as tournament_url, 
            tournament.dimension as tournament_dimension, tournament.domain as domain, 
            sport.sport_name_th, sport.sport_name_en, sport.url as sport_url, sport.dimension as sport_dimension 
            FROM ss_column
            LEFT JOIN ss_picture AS picture ON ss_column.column_id2 = picture.ref_id 
            LEFT JOIN ss_tournament tournament ON ss_column.tournament_id = tournament.tournament_id 
            LEFT JOIN ss_sport sport ON ss_column.sport_id = sport.sport_id 
            LEFT JOIN ss_columnist columnist ON ss_column.columnist_id = columnist.columnist_id 
            LEFT JOIN ss_highlight_news_mapping ON ss_column.column_id2 = ss_highlight_news_mapping.news_id 
            WHERE ss_column.${field} = ${id}
            AND ss_column.status = 1 
            AND ss_column.approve = 1
            AND ss_column.lang = "th"
            AND picture.ref_type = 2 
            AND picture.default = 1 
            ${orderBy}
            LIMIT ${startLimit}, ${itemPerPage};`;

    var listItem = await db.read(queryItems);

    if (helpers.isEmptyObject(listItem)) {
      throw {
        code: 400,
        message: "data not found."
      };
    }

    // Set custom datetime
    listItem.map(row => {
      row.types = "column";
      var cd = moment(row.approve_date).locale("th");
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
          column_id: row.column_id,
          types: row.types,
          title: row.title,
          thumbnail: row.thumbnail,
          lastupdate_date: row.lastupdate_date,
          approve_date: row.approve_date,
          start_date: row.start_date,
          expire_date: row.expire_date,
          view: row.countview,
          share: row.share,
          columnist_id: row.columnist_id,
          columnist_name: row.columnist_name,
          columnist_alias: row.columnist_alias,
          columnist_avatar: row.columnist_avatar,
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
        results.info.cached = "success";
      })
      .catch(error => {
        results.info.cached = "failed";
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
