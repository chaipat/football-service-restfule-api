var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var request = require('request');
var dateFormat = require('dateformat');
var async = require("async");

var redisCluster = config.getRedisCluster();
var mysql_connection = config.getMySQLConnection();
var redisCaching = require('./redisCaching');
var mysqlModule = require('./mysqlModule');
var cacheKeyPrefix = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName();

var sitemapModule = sitemapModule.prototype;

function sitemapModule() {

}

sitemapModule.getSitemapTest = function(req, res, next) {
	res.send('test...');
}

sitemapModule.getSitemapToday = function(req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'main-sitemap-today';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if(error) {
          return utils.printJSON(res, utils.getJSONObject(errorCode, error.stack, null));
      } else {
          if (reply) {
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cache deleted", "cache_key":cacheKey}, null));
          } else {
              return utils.printJSON(res, utils.getJSONObject(200, {'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.'}, null));
          }
      }
    });

  } else {
   redisCaching.cacheExist(res, cacheKey, function(error, reply) {

      if (error) {
        return utils.printJSON(res, utils.getJSONObject(errorCode, error.stack, null));

      } else {

        if(reply) {
          redisCaching.getCache(res, cacheKey, function(error, result) {

            if (error) {
              return utils.printJSON(res, utils.getJSONObject(errorCode, error.stack, null));

            } else {

              var json = JSON.parse(result);
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cached redis", "cache_key": cacheKey}, json));
            }

          });

        } else {

            var data = {};
            var listNews = {};
            var listColumn = {};
            var categoryContents = [];

            async.series([
              function(callback) { // get news
                  var query = "";
                  query += " SELECT 'news' as types, sn.create_date as create_date,  ";
                  query += " sn.news_id2 as id, sn.lastupdate_date, coalesce(st.domain, '') as domain,  ";
                  query += " st.url as tournament_url, ss.url as sport_url  ";
                  query += " FROM ss_news sn ";
                  query += " LEFT JOIN ss_tournament st  ";
                  query += " ON sn.tournament_id = st.tournament_id  ";
                  query += " LEFT JOIN ss_sport ss  ";
                  query += " ON sn.sport_id = ss.sport_id  ";
                  query += " WHERE sn.status = 1  ";
                  query += " AND sn.approve = 1  ";
                  query += " AND DATE_FORMAT(sn.create_date, '%Y-%m-%d') = CONCAT(DATE_FORMAT(NOW(), '%Y-%m'), '-', (DATE_FORMAT(NOW(), '%d') * 1)-1 ) ";
                  query += " UNION ";
                  query += " SELECT 'column' as types, sc.create_date as create_date,  ";
                  query += " sc.column_id2 as id, sc.lastupdate_date, coalesce(st.domain, '') as domain,  ";
                  query += " st.url as tournament_url, ss.url as sport_url  ";
                  query += " FROM ss_column sc ";
                  query += " LEFT JOIN ss_tournament st  ";
                  query += " ON sc.tournament_id = st.tournament_id  ";
                  query += " LEFT JOIN ss_sport ss  ";
                  query += " ON sc.sport_id = ss.sport_id  ";
                  query += " WHERE sc.status = 1  ";
                  query += " AND sc.approve = 1  ";
                  query += " AND DATE_FORMAT(sc.create_date, '%Y-%m-%d') = CONCAT(DATE_FORMAT(NOW(), '%Y-%m'), '-', (DATE_FORMAT(NOW(), '%d') * 1)-1 ) ";
                  query += " ORDER BY create_date DESC  ";
				  

                  mysqlModule.getData(query, function(error, result) {
                      if(error) return callback(error);
                      data = result;

                      listNews = data;
                      callback();
                  });

              },
              function(callback) {
                redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                  if(error) return callback(error);
                  callback();
                });
              }
            ], function(error) {
              if(error) {
                return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));

              } else {
                return utils.printJSON(res, utils.getJSONObject(200, {
                  "status": "success",
                  "cache": "redis",
                  "cache_key": cacheKey}, data));
              }
            });
			
        }
      }
    });
  }

}

module.exports = sitemapModule;
