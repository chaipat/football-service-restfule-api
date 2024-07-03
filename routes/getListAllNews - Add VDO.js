// *** Create 26/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-news-all-';
var cache_timeout = 0; // 1 minute


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

function getVdo(mysql_connection, param, key, jsonObj, redisCluster, callback) {
    var values = {};
    var query = "";
    var data = {};
    var query_data = [];


    values.push(jsonObj);

    query_data.push(param.is_local)

    query = "SELECT DISTINCT tournament_id FROM ss_news ";
    query += " WHERE status=1 AND approve=1 AND lang='th' AND is_local = ? ";

    async.series([
        function(callback) {
            mysql_connection.query({
                sql: query,
                timeout: 2000,
                values: query_data
            }, function(error, result) {

                if (error) {
                    callback(error, error.stack);
                } else {
                    if (!utils.isEmptyObject(result)) {
                        data = result;
                    } else {
                        callback(500, "Data not found");
                    }
                }
            })
        },
        function(callback) {
            async.each(data, function(item, cb) {
                var query_2 = "";
                var query_data_2 = [];
                query_data_2.push(item.tournament_id);

                query_2 = "SELECT vdo.`video_id2` AS video_id, vdo.`brightcove_id`, vdo.`tournament_id`, ";
                query_2 += " vdo.`sport_id`, vdo.`embed_video`, vdo.`title`, vdo.`caption`, vdo.`countview`, ";
                query_2 += " vdo.`share`, vdo.`order_by`, DATE_FORMAT(vdo.create_date, '%Y-%m-%d %H:%i') AS create_date, ";
                query_2 += " DATE_FORMAT(vdo.lastupdate_date, '%Y-%m-%d %H:%i') AS lastupdate_date ";
                query_2 += " FROM `ss_video` vdo WHERE vdo.status = 1 AND vdo.approve = 1 AND vdo.lang = 'th' ";
                query_2 += " AND vdo.tournament_id = ? ORDER BY vdo.lastupdate_date DESC";

                mysql_connection.query({
                    sql: query_2,
                    timeout: 2000,
                    values: query_data_2
                }, function(error, result) {

                    if (error) {
                        callback(error, error.stack);
                    } else {

                        if (!utils.isEmptyObject(result)) {
                            values.push(result);
                        } else {
                            result = [];
                            values.push(result);
                        }

                        cb();
                    }
                });

                jsonObj.results = values;
                jsonObj.results.sort(function(a, b) {
                    return a.order_by > b.order_by;
                });

            });
        }

    ], function(error) {
        if (error) {
            callback(error, error.stack);
        } else {
            callback(error, jsonObj);
        }
    });
}

function getList(mysql_connection, param, key, redisCluster, callback) {
    var local = param.is_local;

    var mysql_connection = config.getMySQLConnection();
    mysql_connection.connect(function(err) {

        if (err) {
            mysql_connection.end();
            log.error("[500] list/news/getList/getListAllNews Service[getList]: " + err.stack);
            callback(500, error.stack);
        } else {
            query = "SELECT count(news_id2) as row FROM ss_news WHERE (status=1 AND approve=1 AND lang='th') ";
            mysql_connection.query({
                sql: query,
                timeout: 2000, //2 Sec.
            }, function(error, results) {

                if (error) {
                    mysql_connection.end();
                    log.error("[500] list/news/getList/getListAllNews Service[getList]: " + error.stack);
                    callback(500, error.stack);
                    throw new Error(error.stack);
                } else {

                    var resultObject = results[0];
                    var row = resultObject["row"];

                    var page_total = Math.ceil(row / param.limit);
                    if (param.page >= page_total)
                        param.page = page_total;

                    var offset = (param.page == 0) ? param.page : (param.page - 1) * param.limit;
                    query = "SELECT news_id2 as news_id, ss_news.tournament_id, ss_news.sport_id, ss_news.icon_pic, ";
                    query += " icon_vdo, headline, ss_news.title, ss_news.countview, ss_news.share, ";
                    query += " DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%i') as create_date, ";
                    query += " DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%i') as lastupdate_date, ";
                    query += " ss_picture.folder, ss_picture.file_name, ss_picture.ref_type as picture_type, ";
                    query += " ss_news.redirect_url, ss_news.order_by, ss_highlight_news_mapping.types, ";
                    query += " ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ";
                    query += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
                    query += " FROM ss_news LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id` ";
                    query += " AND (`ss_picture`.`ref_type` = 1 AND `ss_picture`.default = 1) ";
                    query += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
                    query += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
                    query += " LEFT JOIN ss_highlight_news_mapping ON ss_news.news_id2 = ss_highlight_news_mapping.news_id and ss_highlight_news_mapping.highlight_category_id = 1 ";
                    query += " WHERE ss_news.status=1 AND ss_news.approve=1 AND ss_news.lang='th' AND ss_news.is_local = " + local;
                    query += " ORDER BY `ss_news`.`lastupdate_date` DESC LIMIT " + offset + ", " + param.limit;

                    mysql_connection.query({
                        sql: query,
                        timeout: 2000, //2 Sec.
                    }, function(error, results) {
                        mysql_connection.end();
                        if (error) {
                            log.error("[500] list/news/getList/getListAllNews Servcie[getList]: " + error.stack);
                            callback(500, error.stack);
                            throw new Error(error.stack);
                        } else {

                            ///// OUTPUT /////
                            if (utils.isEmptyObject(results)) {
                                callback(501, "Data not found.");

                            } else { // Have Data;      
                                var jsonObj = utils.getJSONPaginationObject(200, "success", results, param.page, page_total, row, "appListAllNews");
                                var jsonStr = JSON.stringify(jsonObj);

                                for (var i = 0; i < results.length; i++) {
                                    var obj = results[i];
                                    obj.thumbnail = obj.folder + "/" + obj.file_name;
                                    results[i] = obj;

                                    var data2 = results[i];
                                    for (var j in data2) {
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
                                var jsonObj = utils.getJSONPaginationObject(200, "Success", results, param.page, page_total, row);
                                var jsonStr = JSON.stringify(jsonObj);

                                callback(null, mysql_connection, param, key, jsonObj, redisCluster);
                            }
                            //////END OUTPUT/////////// 
                        }
                    });
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

            log.error("[500] list/news/getList/getListAllNews Service[getDataFromMySQL]: " + connectionError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectionError.stack, null));
        } else {
            async.waterfall([
                async.apply(getList, mysql_connection, param, key, redisCluster),
                getVdo,
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
    var key = redis_key + param.local + "-" + param.limit + "-" + param.page;

    redisCluster = config.getRedisCluster();
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
                                log.error("[500] list/news/getList/getListAllNews Service[redisCluster.get]: " + err.stack);
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

router.get('/:local/:item/:page', function(req, res, next) {
    var param = {};
    param.limit = req.params.item;
    param.page = req.params.page;
    param.local = req.params.local;
    param.clear_cache = false;

    if (req.params.local == 'th') {
        param.is_local = 1;
    } else {
        param.is_local = 0;
    }

    getDataFromRedis(res, param);

});

router.get('/:local/:item/:page/:clear_cache', function(req, res, next) {
    var param = {};
    param.limit = req.params.item;
    param.page = req.params.page;
    param.local = req.params.local;

    if (req.params.local == 'th') {
        param.is_local = 1;
    } else {
        param.is_local = 0;
    }

    if (req.params.clear_cache == 'true') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }

    getDataFromRedis(res, param);

});


module.exports = router;
