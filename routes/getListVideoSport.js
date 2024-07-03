// *** Create 26/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-video-sport-';
var cache_timeout = 60; // 1 minute
var request = require('request');


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

    var query = "SELECT count(video_id2) as row FROM ss_video WHERE (status=1 AND approve=1 AND lang='th') and sport_id = " + param.video_sport_id;
    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
    }, function(error, results) {

        if (error) {
            log.error("[500] list/video/getList/getListVideoSport[getList]: " + error.stack);
            callback(500, error.stack);
            throw new Error(error.stack);
        } else {

            var resultObject = results[0];
            var row = resultObject["row"];

            var page_total = Math.ceil(row / param.limit);
            if (param.page >= page_total)
                param.page = page_total;

            var offset = (param.page == 0) ? param.page : (param.page - 1) * param.limit;
            query = "SELECT vdo.video_id2 AS video_id, vdo.brightcove_id, vdo.tournament_id, ";
            query += " vdo.sport_id, vdo.embed_video, vdo.title, vdo.countview, vdo.share, vdo.order_by, ";
            query += " DATE_FORMAT(vdo.create_date, '%d-%m-%Y %H:%m') AS create_date, ";
            query += " DATE_FORMAT(vdo.lastupdate_date, '%d-%m-%Y %H:%m') AS lastupdate_date, ";
            query += " picture.ref_type as picture_type, picture.folder, picture.file_name, ";
            query += " tournament.tournament_name_th, tournament.tournament_name_en, tournament.url as tournament_url, tournament.dimension as tournament_dimension, ";
            query += " sport.sport_name_en, sport.sport_name_th, sport.url as sport_url, sport.dimension as sport_dimension ";
            query += " FROM `ss_video` AS vdo ";
            query += " LEFT JOIN `ss_picture` AS picture ON vdo.video_id2 = picture.ref_id ";
            query += " AND picture.ref_type = 4 AND picture.default = 1 ";
            query += " LEFT JOIN ss_tournament tournament ON vdo.tournament_id = tournament.tournament_id ";
            query += " LEFT JOIN ss_sport sport ON vdo.sport_id = sport.sport_id ";
            query += " WHERE (vdo.`status` = 1 AND vdo.`approve` = 1) AND vdo.`lang` = 'th' ";
            query += " AND vdo.`sport_id` = " + param.video_sport_id + " ORDER BY vdo.`order_by` ASC, vdo.`lastupdate_date` DESC ";
            query += " LIMIT " + offset + ", " + param.limit;

            mysql_connection.query({
                sql: query,
                timeout: 2000, //2 Sec.
            }, function(error, results) {

                if (error) {
                    log.error("[500] list/video/getList/getListVideoSport[getList]: " + error.stack);
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

                        var jsonObj = utils.getJSONPaginationCustomObject(200, "success", results, param.page, page_total, row, tournament_name_th, tournament_name_en, sport_name_th, sport_name_en, "appListVideoSport");
                        var jsonStr = JSON.stringify(jsonObj);

                        for (var i = 0; i < results.length; i++) {
                            var obj = results[i];
                            obj.thumbnail = obj.folder + "/" + obj.file_name;
                            results[i] = obj;

                            var data2 = results[i];
                            for (var j in data2) {
                                var picType = 'vdo';
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
                        callback(null, mysql_connection, param, key, jsonObj, redisCluster);
                    }
                }
            });
        }
    });
}

function getListFromPhp(mysql_connection, param, key, redisCluster, callback) {
    var video_id = param.video_sport_id;
    var page = param.page;

    request('http://sstv.siamsport.co.th/rss/list_video.php?page=' + page + '&idts=' + video_id, function(error, response, body) {
        if (!error && response.statusCode == 200) {

            var objectBody = {};

            objectBody = JSON.parse(body);
            callback(null, mysql_connection, param, key, objectBody, redisCluster);
        } else {
            objectBody = {};
            callback(501, 'No data.');
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

            log.error("[500] list/video/getList/getListVideoSport Service[getDataFromMySQL]: " + connectionError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectionError.stack, null));
        } else {
            async.waterfall([
                // async.apply(getList, mysql_connection, param, key, redisCluster),
                async.apply(getListFromPhp, mysql_connection, param, key, redisCluster),
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {
                    if (error == 200) {
                        utils.printJSON(res, result);
                    } else {

                        if (redisCluster != null) {
                            redisCluster.disconnect();
                            redisCluster = null;
                        }
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

    var key = redis_key + param.video_sport_id + "-" + param.limit + "-" + param.page;
    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {
        redisCluster.exists(key, function(error, reply) {

            if (error) {

                if (redisCluster != null) {
                    redisCluster.disconnect();
                    redisCluster = null;
                }
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
                                log.error("[500] list/video/getList/getListVideoSport Service[redisCluster.get]: " + err.stack);
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

router.get('/:video_sport_id/:item/:page', function(req, res, next) {
    var param = {};
    param.video_sport_id = req.params.video_sport_id;
    param.limit = req.params.item;
    param.page = req.params.page;
    param.clear_cache = false;

    getDataFromRedis(res, param);

});

router.get('/:video_sport_id/:item/:page/:clear_cache', function(req, res, next) {
    var param = {};
    param.video_sport_id = req.params.video_sport_id;
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
