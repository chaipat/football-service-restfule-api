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

var galleryModule = galleryModule.prototype;

function galleryModule() {

}

galleryModule.getHilightByType = function(req, res, next) {

  var galleryTypeId = req.query.galleryTypeId;
  var orderby = req.query.orderby;
  var limit = req.query.limit;
  var clearCache = req.query.clearCache;

  if ( orderby === '' || typeof orderby === 'undefined' ) {
    orderby = 'lastupdate';
  }


  if( limit === '' || typeof limit === 'undefined' || isNaN(limit) ) {
    limit = 5;
  } else {
    limit = parseInt(limit);
  }

  if( clearCache === '' || typeof clearCache === 'undefined' ) {
    clearCache = false;
  }

  if( isNaN(galleryTypeId) ) {
    next(err);
  } else {
    var cacheKey = cacheKeyPrefix + 'main-gallery-getHilight-type-' + galleryTypeId
              + '-' + orderby + '-' + limit;
  }


  if (clearCache) {

    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if(error) {
          utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
      } else {
          if (reply) {
              utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cache deleted", "cache_key":cacheKey}, null));
          } else {
              utils.printJSON(res, utils.getJSONObject(200, {'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.'}, null));
          }
      }

    });

  } else {

    redisCaching.cacheExist(res, cacheKey, function(error, reply) {

      if (error) {

        utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

      } else {

        if(reply) {

          redisCaching.getCache(res, cacheKey, function(error, result) {

            if (error) {

              utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

              var json = JSON.parse(result);
              utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cached redis", "cache_key": cacheKey}, json));
            }

          });

        } else {
            // get data from mysql;
            if ( orderby === 'lastupdate' || orderby === '' || typeof orderby === 'undefined' ) {
              orderby = 'ss_g.create_date DESC';
            }

            var query = 'SELECT ss_g.gallery_id2 as gallery_id, ss_gt.gallery_type_name, \
            ss_g.title, ss_g.lastupdate_date, \
            ss_p.folder, ss_p.file_name, ss_p.ref_type as picture_type \
            FROM ss_gallery ss_g \
            LEFT JOIN ss_gallery_type ss_gt \
            ON ss_g.gallery_type_id = ss_gt.gallery_type_id2 \
            LEFT JOIN ss_picture ss_p \
            ON ss_g.gallery_id2 = ss_p.ref_id \
            WHERE ss_g.gallery_type_id = ' + galleryTypeId + ' \
            AND ss_p.default = 1 \
            AND ss_p.ref_type = 3 \
            AND ss_g.status = 1 \
            ORDER BY '+ orderby +' LIMIT ' + limit;

            mysqlModule.getData(query, function(error, result) {
                if(error) {
                    utils.printJSON(res, utils.getJSONObject(500, query, null));
                } else {
                  var data = result;

                  for(var i in data) {
                      var picType = 'gallery';
                      var picture_size = {
                        'fullsize': picType + '/' + data[i]['folder'] + '/' + data[i]['file_name'],
                        'size150': 'size150/' + data[i]['folder'] + '/' + data[i]['file_name'],
                        'size192': 'size192/' + data[i]['folder'] + '/' + data[i]['file_name'],
                        'size318': 'size318/' + data[i]['folder'] + '/' + data[i]['file_name'],
                        'size540': 'size540/' + data[i]['folder'] + '/' + data[i]['file_name'],
                        'size640': 'size640/' + data[i]['folder'] + '/' + data[i]['file_name']
                      };
                      data[i].picture_size = picture_size;
                  }

                  redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                    if(error) {
                      utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "no cache - " + error.message, "cache_key": cacheKey }, data));
                    } else {
                      utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "redis", "cache_key": cacheKey}, data));
                    }
                  });

                }
            });

        }

      }

    });
  }

}


module.exports = galleryModule;
