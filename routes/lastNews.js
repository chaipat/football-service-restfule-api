// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-last-news';
var cache_timeout = 60; // 1 minute
var static_image_url = config.getStaticImageURL();

function setData2Redis(mysql_connection, param, data, key, redisCluster, callback) {

    var value = JSON.stringify(data);
    if (redisCluster != null) {

        redisCluster.set(key, value, function(error, reply) {

            if (!error) {
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

function getDetail(mysql_connection, param, key, redisCluster, callback) {

    var query_string = " SELECT news_id2 as id, ss_news.tournament_id, ss_news.sport_id, icon_pic, ";
    query_string += " ss_news.news_type_id, ss_news_type.name AS news_type_name, ";
    query_string += " icon_vdo, ss_news.news_special_id, ss_ns.name as news_special_name, headline, title, countview, share, ";
    query_string += " DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%i') as create_date, ";
    query_string += " DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%i') as lastupdate_date, ";
    query_string += " ss_picture.folder, ss_picture.file_name, ss_picture.ref_type as picture_type, ";
    query_string += " redirect_url, order_by, ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ";
    query_string += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
    query_string += " FROM ss_news ";
    query_string += " LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id` ";
    query_string += " AND (`ss_picture`.`ref_type` = 1 AND `ss_picture`.default = 1) ";
    query_string += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
    query_string += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
    query_string += " LEFT JOIN ss_news_type ON ss_news.news_type_id = ss_news_type.news_type_id ";
    query_string += " LEFT JOIN ss_news_special ss_ns ON ss_news.news_special_id = ss_ns.news_special_id ";
    query_string += " WHERE ss_news.status=1 AND ss_news.approve=1 AND ss_news.lang='th' ";
    query_string += " AND ss_news.sport_id = 1 ";
    query_string += " ORDER BY `ss_news`.`lastupdate_date` DESC LIMIT 8 ";

    try {
        mysql_connection.query({
            sql: query_string,
            timeout: 2000,
        }, function(error, result) {

            if (error) {

                log.error("[500] last/news/getList Service[getDetail]: " + error.stack);
                callback(500, error.stack);

            } else {

                if (!utils.isEmptyObject(result) && result.length > 0) {

                    var data = result;

                    if (data.detail != null) {
                        data.detail = data.detail.replace(/\/uploads/g, static_image_url);
                    }

                    for (var i = 0; i < result.length; i++) {

                        var obj = result[i];
                        obj.thumbnail = obj.folder + "/" + obj.file_name;
                        obj.types = 'news';
                        result[i] = obj;

                        var data2 = result[i];
                        for (var j in data2) {

                            var picType = 'news';
                            var picture_size = {
                                'fullsize': picType + '/' + data2['folder'] + '/' + data2['file_name'],
                                'size128': 'size128/' + data2['folder'] + '/' + data2['file_name'],
                                'size224': 'size224/' + data2['folder'] + '/' + data2['file_name'],
                                'size304': 'size304/' + data2['folder'] + '/' + data2['file_name'],
                                'size640': 'size640/' + data2['folder'] + '/' + data2['file_name']
                            };
                            result[i].picture_size = picture_size;
                        }
                    }
                    callback(null, mysql_connection, param, data, key, redisCluster);

                } else {
                    callback(501, "Data not found.");
                }
            }
        });
    } catch (err) {
        callback(500, err.stack);
    }
}

function getDataFromMySQL(res, redisCluster, param, key) {

    var mysql_connection = config.getMySQLConnection();
    mysql_connection.connect(function(connectError) {

        if (connectError) {

            mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null
            }

            log.error("[500] last/news/getList Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));

        } else {

            async.waterfall([
                async.apply(getDetail, mysql_connection, param, key, redisCluster),
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {

                    var output = [];
                    output[0] = result;
                    if (error == 200) {
                        utils.printJSON(res, utils.getJSONObject(200, "Success", result));
                    } else {
                        utils.printJSON(res, utils.getJSONObject(error, result, null));
                    }

                } else {

                    var output = [];
                    output[0] = result;
                    utils.printJSON(res, utils.getJSONObject(200, "Success", result));
                }
            });
        }
    });
}

function getDataFromRedis(res, param) {

    var key = redis_key;
    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {

        try {

            redisCluster.exists(key, function(err, reply) {

                if (err) {

                    if (redisCluster != null) {
                        redisCluster.disconnect();
                        redisCluster = null;
                    }
                    utils.printJSON(res, utils.getJSONObject(500, err.stack, null));

                } else {

                    if (reply == true) {

                        if (param.clear_cache == true) {

                            redisCluster.del(key, function(err) {

                                if (redisCluster != null) {
                                    redisCluster.disconnect();
                                    redisCluster = null
                                }
                            });

                            utils.printJSON(res, utils.getJSONObject(200, "Delete: " + key, null));

                        } else {

                            redisCluster.get(key, function(error, reply) {

                                if (error) {

                                    log.error("[500] last/news/getList Service[redisCluster.get]: " + error.stack);
                                    getDataFromMySQL(res, redisCluster, param, key);

                                } else {

                                    if (reply != "" && reply != undefined) {

                                        var json = [];
                                        json[0] = JSON.parse(reply);

                                        if (redisCluster != null) {
                                            redisCluster.disconnect();
                                            redisCluster = null
                                        }

                                        utils.printJSON(res, utils.getJSONObject(200, "Redis", JSON.parse(reply)));

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

        } catch (error) {
            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }
            getDataFromMySQL(res, redisCluster, param, key);
        }

    });

    redisCluster.once('error', function(err) {

        try {
            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }
        } catch (error) {}

        getDataFromMySQL(res, redisCluster, param, key);
    });
}

router.get('/', function(req, res, next) {

    var param = {};
    param.clear_cache = false;
    getDataFromRedis(res, param);
});

router.get('/:clear_cache', function(req, res, next) {

    var param = {};
    if (req.params.clear_cache == 'true') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }

    getDataFromRedis(res, param);
});

module.exports = router;
