// *** Create 26/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-news-sport-';
var cache_timeout = 60; // 1 minute


function setData2Redis(mysql_connection, param, key, data, redisCluster, callback) {
    
	if (redisCluster != null) {
        redisCluster.set(key, JSON.stringify(data), function(err, reply) {
            
            if (!err) {
                redisCluster.expire(key, cache_timeout);
            }

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }
        });

        callback(null, data);
    } else {
        callback(null, data);    
    }
}

function getList(mysql_connection, param, key, redisCluster, callback) {
    
    var query = "SELECT count(news_id) as row FROM ss_news WHERE (status=1 AND approve=1 AND lang='th') and sport_id = " + param.sport_id;
    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
    }, function(error, results) {

        if (error) {
            log.error("[500] list/news/getList/sport[getList]: " + error.stack);
            callback(500, error.stack);
            throw new Error(error.stack);
        } else {

            var resultObject = results[0];
            var row = resultObject["row"];

            var page_total = Math.ceil(row / param.limit);
            if (param.page >= page_total)
                param.page = page_total;

            var offset = (param.page == 0) ? param.page : (param.page - 1) * param.limit;
            query = "SELECT news_id2 as id, ss_news.tournament_id, ss_news.sport_id, icon_pic, icon_vdo, ";
            query += " ss_news.news_special_id, ss_ns.name as news_special_name, headline, title, countview, share, ";
            query += " DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%i') as create_date, ";
            query += " DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%i') as lastupdate_date, ";
            query += " ss_picture.ref_type as picture_type, ss_picture.folder, ss_picture.file_name, ";
            query += " redirect_url, order_by, ss_tournament.tournament_name_th, ";
            query += " ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ";
            query += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
            query += " FROM ss_news LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id` ";
            query += " AND (`ss_picture`.`ref_type` = 1 AND `ss_picture`.default = 1) ";
            query += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
            query += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
            query += " LEFT JOIN ss_news_special ss_ns ON ss_news.news_special_id = ss_ns.news_special_id ";
            query += " WHERE ss_news.status=1 AND ss_news.approve=1 AND (ss_news.lang='th' AND `ss_news`.`sport_id` = " + param.sport_id + ") ";
            query += " ORDER BY `ss_news`.`lastupdate_date` DESC ";
            query += " LIMIT " + offset + ", " + param.limit;

            mysql_connection.query({
                sql: query,
                timeout: 2000, //2 Sec.
            }, function(error, results) {

                if (error) {
                    log.error("[500] list/news/getList/sport[getList]: " + error.stack);
                    callback(500, error.stack);
                    throw new Error(error.stack);
                } else {

                    ///// OUTPUT /////
                    if (utils.isEmptyObject(results)) {
                        callback(501, "Data not found.");

                    } else { // Have Data;      

                        var resultObject2 = results[0];
                        var tournament_name_th = resultObject2["tournament_name_th"];
                        var tournament_name_en = resultObject2["tournament_name_en"];
                        var sport_name_th = resultObject2["sport_name_th"];
                        var sport_name_en = resultObject2["sport_name_en"];


                        var jsonObj = utils.getJSONPaginationCustomObject(200, "success", results, param.page, page_total, row, tournament_name_th, tournament_name_en, sport_name_th, sport_name_en, "appListSportNews");
                        var jsonStr = JSON.stringify(jsonObj);

                        for (var i = 0; i < results.length; i++) {
                            var obj = results[i];
                            obj.thumbnail = obj.folder + "/" + obj.file_name;
                            results[i] = obj;

                            var data2 = results[i];
                            for(var j in data2){
                                var picType = 'news';
                                  var picture_size = {
                                    'fullsize': picType + '/' + data2['folder'] + '/' + data2['file_name'],
                                    'size128': 'size128/' + data2['folder'] + '/' + data2['file_name'],
                                    'size224': 'size224/' + data2['folder'] + '/' + data2['file_name'],
                                    'size304': 'size304/' + data2['folder'] + '/' + data2['file_name'],
                                    'size640': 'size640/' + data2['folder'] + '/' + data2['file_name']
                                  };
                                  results[i].picture_size = picture_size;
                            }
                        }

                        var jsonObj = utils.getJSONPaginationCustomObject(200, "Success", results, param.page, page_total, row, tournament_name_th, tournament_name_en, sport_name_th, sport_name_en);
                        callback(null,mysql_connection, param, key, jsonObj, redisCluster);
                    }
                    //////END OUTPUT/////////// 
                }
            });
        }
    });
}

function getDataFromMySQL(res, redisCluster, param, key) {
    
    var mysql_connection = config.getMySQLConnection();
    mysql_connection.connect(function(connectionError) {

        if (connectionError) {
            mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] list/news/getList/getListSport Service[getDataFromMySQL]: " + connectionError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectionError.stack, null));
        } else {
            async.waterfall([
                async.apply(getList, mysql_connection, param, key, redisCluster),
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {
                    if (error == 200) {
                        utils.printJSON(res, result);
                    } else {
                        utils.printJSON(res, utils.getJSONObject(error, result));
                    }
                } else {
                    utils.printJSON(res, result);
                }
            });
        }
    });
}

function getDataFromRedis(res, param) {
    
    var key = redis_key + param.sport_id + "-" + param.limit + "-" + param.page;
    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {
        redisCluster.exists(key, function(error, reply) {

            if (error) {
                utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
            } else {

                if (reply == true) {
                    if (param.clear_cache == true) {
                        redisCluster.del(key, function(err) {
                            
                            if (redisCluster != null) {
                                redisCluster.disconnect();
                                redisCluster = null;
                            }
                        });

                        utils.printJSON(res, utils.getJSONObject(200, "Delete: " + key, null));
                    } else {
                        redisCluster.get(key, function(err, reply) {
                            if (err) {
                                log.error("[500] list/news/getList/getListSport Service[redisCluster.get]: " + err.stack);
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else {
                                if (reply != "" && reply != undefined) {
                                    
                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }
                                    
                                    utils.printJSON(res, JSON.parse(reply));
                                } else {
                                    getDataFromMySQL(res, redisCluster, param, key);
                                }
                            }
                        });
                    }
                } else {
                    getDataFromMySQL(res, redisCluster, param, key);
                }
            }
        });
    });
}

/* GET users listing. */
router.get('/', function(req, res, next) {
    utils.printJSON(res, utils.getJSONObject(502, "Missing parameter.", null));
});

router.get('/:sport_id/:item/:page', function(req, res, next) {
    var param = {};
    param.sport_id = req.params.sport_id;
    param.limit = req.params.item;
    param.page = req.params.page;
    param.clear_cache = false;

    getDataFromRedis(res, param);

});

router.get('/:sport_id/:item/:page/:clear_cache', function(req, res, next) {
    var param = {};
    param.sport_id = req.params.sport_id;
    param.limit = req.params.item;
    param.page = req.params.page;

    if (req.params.clear_cache == 'true') {
    	param.clear_cache = true;
    } else {
    	param.clear_cache = false;	
    }

    getDataFromRedis(res, param);

});


module.exports = router;
