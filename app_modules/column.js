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

var columnModule = columnModule.prototype;

function columnModule() {

}

columnModule.getHilighColumnists = function(req, res, next) {

  var clearCache = req.query.clearCache;

  if( clearCache === '' || typeof clearCache === 'undefined' ) {
    clearCache = false;
  }

  var cacheKey = cacheKeyPrefix + 'main-column-getHilight-columnists';


  if (clearCache) {

    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if(error) {
          return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
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

        return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

      } else {

        if(reply) {

          redisCaching.getCache(res, cacheKey, function(error, result) {

            if (error) {

              return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

              var json = JSON.parse(result);
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cached redis", "cache_key": cacheKey}, json));
            }

          });

        } else {
            // get data from mysql;
            var query = 'SELECT hn.news_id, hn.types, hn.title, hn.thumbnail, sc.lastupdate_date, st.tournament_name_th, st.tournament_name_en, st.domain, \
            cn.columnist_id, cn.name, cn.alias, cn.avatar, \
            hc.name as category_name, hp.folder, hp.file_name, hp.ref_type as picture_type \
            FROM ss_highlight_news_mapping hn \
            LEFT JOIN ss_highlight_category hc \
            ON hn.highlight_category_id = hc.highlight_category_id \
            LEFT JOIN ss_column sc \
            ON hn.news_id = sc.column_id2 \
            LEFT JOIN ss_columnist cn \
            ON sc.columnist_id = cn.columnist_id \
            LEFT JOIN ss_picture hp \
            ON hn.news_id = hp.ref_id \
            LEFT JOIN ss_tournament st \
            ON sc.tournament_id = st.tournament_id \
            WHERE hn.highlight_category_id = 8 \
            AND hp.ref_type = 2 \
            AND hn.status = 1 \
            ORDER BY hn.order_by, hn.lastupdate_date DESC \
            LIMIT 5';

            mysqlModule.getData(query, function(error, result) {
                if(error) {
                    return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
                } else {
                  var data = result;

                  for(var i in data) {

                      var picType = data[i]['types'];
                      var picture_size = {
                        'fullsize': picType + '/' + data[i]['folder'] + '/' + data[i]['file_name'],
                        'size128': 'size128/' + data[i]['folder'] + '/' + data[i]['file_name'],
                        'size224': 'size224/' + data[i]['folder'] + '/' + data[i]['file_name'],
                        'size304': 'size304/' + data[i]['folder'] + '/' + data[i]['file_name'],
                        'size640': 'size640/' + data[i]['folder'] + '/' + data[i]['file_name']
                      };
                      data[i].picture_size = picture_size;
                  }

                  redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                    if(error) {
                      return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "no cache - " + error.message, "cache_key": cacheKey }, data));
                    } else {
                      return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "redis", "cache_key": cacheKey}, data));
                    }
                  });

                }
            });

        }

      }

    });
  }

}

module.exports = columnModule;
