const moment = require("moment");
const base64 = require("base-64");

const config = require("../../config/index");
const log = require("../../../logging/index");
const helpers = require("../../helper/helper");
const cached = require("../caching/redis");
const MySqlClass = require("../database/mysql.class");
const news = require("./news");

const TOURNAMENT = require("../../config/tournament");
const FILEPATH = `${__dirname}/${__filename}`;

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;

async function getRelate(req) {
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
        cacheKey: cacheKey
      },
      data: data.content
    };

    return results;
  } else {
    var result = {};

    // ----- Get News-----
    try {
      var newsItem = await news.getRelate(req.newsId);

      if (newsItem === null) {
        throw {
          code: 404,
          message: "data not found"
        };
      }

      result = newsItem;
    } catch (error) {
      throw error;
    }

    results = {
      info: {
        dataSource: appMessage.dataSource.mysql,
        cacheKey: cacheKey,
        cacheTtl: config.cacheTtl.category
      },
      data: result
    };

    // --- save data to cache
    var data = {
      content: result
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
  getRelate,
  deleteCache
};
