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

var instantNewsModule = instantNewsModule.prototype;

function instantNewsModule() {

}

instantNewsModule.getLastNewsFeed = function(req, res, next) {
    var limit = req.query.limit;
    var type = req.query.type;
    var clearCache = req.query.clearCache;
    var errorCode = 500;
    
    var query_string = "";
    var query_condition = "";

    if( clearCache === '' || typeof clearCache === 'undefined' ) {
        clearCache = false;
    }

    if( limit === '' || typeof limit === 'undefined' ) {
        limit = 10;
    }

    var cacheKey = cacheKeyPrefix + 'main-instantNews-lastNewsFeed-'
    + limit;

    if (type === 'feed_fb') {
        query_condition = "feed_fb = 1 ";
    } else {
        query_condition = "feed = 1 ";
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
                        var query = " SELECT news_id2 as id, ss_news.tournament_id, ss_news.sport_id, icon_pic, \
                        ss_news.news_type_id, ss_news_type.name AS news_type_name, \
                        icon_vdo, ss_news.news_special_id, ss_news.feed, ss_news.feed_fb, ss_ns.name as news_special_name, \
                        headline, title, ss_news.description, ss_news.detail, countview, share, \
                        ss_news.create_date, ss_news.lastupdate_date, \
                        ss_picture.folder, ss_picture.file_name, ss_picture.ref_type as picture_type, \
                        redirect_url, order_by, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, \
                        ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, \
                        ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension \
                        FROM ss_news \
                        LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id` \
                        AND (`ss_picture`.`ref_type` = 1 AND `ss_picture`.default = 1) \
                        LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id \
                        LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id \
                        LEFT JOIN ss_news_type ON ss_news.news_type_id = ss_news_type.news_type_id \
                        LEFT JOIN ss_news_special ss_ns ON ss_news.news_special_id = ss_ns.news_special_id \
                        WHERE ss_news.status = 1 AND ss_news.approve = 1 AND ss_news.lang = 'th' AND ss_news." + query_condition + " \
                        ORDER BY `ss_news`.`lastupdate_date` DESC LIMIT " + limit + ";";
    
                        mysqlModule.getData(query, function(error, result) {
                            if(error) return callback(error);
                            data = result;
    
                            for(var i in data) {
                                var picType = 'news';
                                var picture_size = {
                                'fullsize': picType + '/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                'size128': 'size128/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                'size224': 'size224/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                'size304': 'size304/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                'size640': 'size640/' + data[i]['folder'] + '/' + data[i]['file_name']
                                };
                                data[i].picture_size = picture_size;
                                data[i].types = 'news';
                            }
    
                            listNews = data;
                            callback();
                        });
    
                    },
                    function(callback) {
                        var query = " SELECT column_id2 as id, ss_column.tournament_id, ss_column.sport_id, icon_pic, \
                        ss_column.icon_vdo, ss_column.feed, ss_column.feed_fb, \
                        title, ss_column.description, ss_column.detail, countview, share, \
                        ss_column.create_date, ss_column.lastupdate_date, \
                        ss_picture.folder, ss_picture.file_name, ss_picture.ref_type as picture_type, \
                        redirect_url, order_by, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, \
                        ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, \
                        ss_tournament.domain as domain, \
                        ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, \
                        ss_sport.dimension as sport_dimension \
                        FROM ss_column \
                        LEFT JOIN `ss_picture` ON `ss_column`.`column_id2` = `ss_picture`.`ref_id` \
                        AND (`ss_picture`.`ref_type` = 2 AND `ss_picture`.default = 1) \
                        LEFT JOIN ss_tournament ON ss_column.tournament_id = ss_tournament.tournament_id \
                        LEFT JOIN ss_sport ON ss_column.sport_id = ss_sport.sport_id \
                        WHERE ss_column.status = 1 AND ss_column.approve = 1 AND ss_column.lang = 'th' AND ss_column." + query_condition + " \
                        ORDER BY `ss_column`.`lastupdate_date` DESC LIMIT " + limit + ";";
    
                        mysqlModule.getData(query, function(error, result) {
                            if(error) return callback(error);
                            data = result;
    
                            for(var i in data) {
                                var picType = 'column';
                                var picture_size = {
                                'fullsize': picType + '/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                'size128': 'size128/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                'size224': 'size224/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                'size304': 'size304/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                'size640': 'size640/' + data[i]['folder'] + '/' + data[i]['file_name']
                                };
                                data[i].picture_size = picture_size;
                                data[i].types = 'column';
                            }
    
                            listColumn = data;
                            callback();
                        });
                    },
                    function(callback) {
                        listNews.forEach((item, index) => {categoryContents.push(item)});
                        listColumn.forEach((item, index) => {categoryContents.push(item)});
                        if (!utils.isEmptyObject(categoryContents)) {
                            data = categoryContents.sort((a, b) => {
                              return new Date(b.lastupdate_date) - new Date(a.lastupdate_date)
                            });
                            data = data.slice(0, limit);
                            callback();
                        } else {
                            errorCode = 400;
                            error = new Error('No data');
                            callback(error);
                        }
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
                        "cache_key": cacheKey,
                        "limit": limit}, data));
                    }
                });
    
            }
    
            }
    
        });
    }    


}

module.exports = instantNewsModule;
