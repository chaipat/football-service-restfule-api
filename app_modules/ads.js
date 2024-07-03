var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var request = require('request');
var dateFormat = require('dateformat');
var async = require("async");
var phpUnserialize = require("php-unserialize");

var redisCluster = config.getRedisCluster();
var mysql_connection = config.getMySQLConnection();
var redisCaching = require('./redisCaching');
var mysqlModule = require('./mysqlModule');
var cacheKeyPrefix = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName();

var adsModule = adsModule.prototype;

function adsModule() {

}
adsModule.getAdsCategory = function(req, res, next) {
  var clearCache = req.query.clearCache;
  var adsCategory = req.params.adsCategory;
  var catId = req.params.id;
  var device = req.query.device;
  var searchField;
  var errorCode = 500;
  var catData = {};
  var defaultData = {};
  var data = {};
  var catTable;
  var adsId = 2;

  if( clearCache === '' || typeof clearCache === 'undefined' ) {
    clearCache = false;
  }

  if( device === '' || typeof device === 'undefined' ) {
    device = 'all';
  }

  if( device === 'mobile') {
    adsId = 3;
  }

  if (adsCategory === 'sport') {
    searchField = 'sportid';
    catTable = 'ss_ads_sport'
  } else if (adsCategory === 'tournament') {
    searchField = 'tournamentid';
    catTable = 'ss_ads_tournament'
  } else {
    return utils.printJSON(res, utils.getJSONObject(400, 'wrong parameter', null));
  }

  if( isNaN(catId) ) {
    return utils.printJSON(res, utils.getJSONObject(400, {'status':'wrong parameter'}, null));

  } else {
    var cacheKey = cacheKeyPrefix + 'ads-getAds-'
      + adsCategory + '-' + catId + '-' + device;
  }


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
            async.series([
              function(callback) {
                var query = 'SELECT a.ads_id, a.tournament_list, a.device, a.special, \
                a.header, a.cover, a.leader_board, a.skin1, a.skin2, a.skin3, \
                a.ads_1, a.ads_2, a.ads_3, a.ads_4, a.ads_5, a.inread, a.footer, \
                a.pre_roll, a.overlay, a.use18up, a.lastupdate_date \
                FROM '+ catTable +' t \
                LEFT JOIN ss_ads a \
                ON t.adsid = a.ads_id \
                WHERE ' + searchField + ' = ' + catId + ' \
                AND a.device = "' + device + '" \
                LIMIT 1';

                mysqlModule.getData(query, function(error, result) {
                  if(error) return callback(error);
                  if (utils.isEmptyObject(result)) {
                    errorCode = 404;
                    error = new Error('Data not found');
                    callback(error);
                  } else {
                    catData = result;
                    callback();
                  }

                });

              },
              function(callback) {
                var query = 'SELECT ads_id, tournament_list, device, special, header, cover, leader_board, skin1, skin2, skin3, \
                ads_1, ads_2, ads_3, ads_4, ads_5, inread, footer, pre_roll, overlay, use18up, \
                lastupdate_date \
                FROM ss_ads \
                WHERE ads_id = ' + adsId;

                mysqlModule.getData(query, function(error, result) {
                  if(error) return callback(error);
                  if (utils.isEmptyObject(result)) {
                    errorCode = 404;
                    error = new Error('Default ads not found');
                    callback(error);
                  } else {
                    defaultData = result;
                    callback();
                  }

                });

              },
              function(callback) {

                for (var item in catData[0]) {
                  if (catData[0][item] === '' || catData[0][item] === null) {
                    catData[0][item] = defaultData[0][item];
                  }
                }

                if (catData[0]['tournament_list'] !== '') {
                  catData[0]['tournament_list'] = phpUnserialize.unserialize(catData[0]['tournament_list']);
                }

                data = catData;
                callback();
              },

              function (callback) {
                redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                  if(error) return callback(error);
                  callback();
                }, 86400);
              }

            ],function(error) {
              if(error) {
                return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));
              } else {
                return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "redis", "cache_key": cacheKey}, data));
              }
            });

        }

      }

    });
  }

}

adsModule.getAdsType = function(req, res, next) {

  var clearCache = req.query.clearCache;
  var adsType = req.params.adsType;
  var paramId = req.query.id;
  var device = req.query.device;
  var adsId;
  var queryDevice;

  if( device === '' || typeof device === 'undefined' ) {
    device = 'all';
  }

  if( clearCache === '' || typeof clearCache === 'undefined' ) {
    clearCache = false;
  }

  if (adsType === 'home') {
    if (device === 'mobile') {
      adsId = 12;
    } else {
      adsId = 1;
    }
    queryDevice = ' AND device = "' + device + '"';
  } else if (adsType === 'default') {
    if (device === 'mobile') {
      adsId = 3;
    } else {
      adsId = 2;
    }
    queryDevice = ' AND device = "' + device + '"';
  } else if (adsType === 'byid'){
    if (isNaN(paramId) || paramId === '' || typeof paramId === 'undefined') {
      return utils.printJSON(res, utils.getJSONObject(400, 'wrong parameter', null));
    } else {
      adsId = paramId;
      queryDevice = '';
    }

  } else {
    return utils.printJSON(res, utils.getJSONObject(400, 'wrong parameter', null));
  }

  var cacheKey = cacheKeyPrefix + 'ads-getAds-' + adsType + '-' + device;

  if(paramId) {
    cacheKey = cacheKey + '-' + paramId;
  }

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

            var query = 'SELECT ads_id, tournament_list, device, special, header, cover, leader_board, skin1, skin2, skin3, \
            ads_1, ads_2, ads_3, ads_4, ads_5, inread, footer, pre_roll, overlay, use18up, \
            lastupdate_date \
            FROM ss_ads \
            WHERE ads_id = ' + adsId + queryDevice;

            mysqlModule.getData(query, function(error, result) {
                if(error) {
                    return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
                } else {

                  if (utils.isEmptyObject(result)) {
                    return utils.printJSON(res, utils.getJSONObject('404', 'Data not found', null));
                  } else {
                    var data = result;

                    if (data[0]['tournament_list'] !== '') {
                      data[0]['tournament_list'] = phpUnserialize.unserialize(data[0]['tournament_list']);
                    }

                    redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                      if(error) {
                        return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "no cache - " + error.message, "cache_key": cacheKey }, data));
                      } else {
                        return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "redis", "cache_key": cacheKey}, data));
                      }
                    }, 86400);

                  }

                }
            });

        }

      }

    });
  }

}

module.exports = adsModule;
