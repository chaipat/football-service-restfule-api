// *** Create 26/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-news-all-';
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

function getVideo(mysql_connection, param, key, news_data, redisCluster, callback) {
    var limit = "";
    var page = "";

    limit = param.limit;
    page = param.page;


    var data = {};
    var list_video = {};

    async.series([
        function(callback) {

            var extra_query = "";

            if (param.local == 'th') {
                extra_query = " AND vdo.tournament_id = 16 ";
            } else if (param.is_ball == false) {
                extra_query = " AND vdo.sport_id <> 1 "
            } else {
                extra_query = " AND vdo.tournament_id = 1 ";
            }

            var query_count_row = ""
            query_count_row = "SELECT COUNT(vdo.video_id2) AS row FROM ss_video vdo ";
            query_count_row += " WHERE vdo.status = 1 AND vdo.approve = 1 ";
            query_count_row += extra_query;

            mysql_connection.query({
                sql: query_count_row,
                timeout: 2000
            }, function(error, result) {

                if (error) {
                    log.error("[500] list/news/getVideo/getListAllNews Service[getVideo]: " + error.stack);
                    callback();
                } else {

                    if (utils.isEmptyObject(result)) {
                        callback(500, "no data.");
                    } else {
                        var resultObject = result[0];
                        var row = resultObject["row"];

                        var page_total = Math.ceil(row / limit);

                        var offset = "";
                        if (page == 0 || page == 1 ) {
                            offset = 0;
                        } else {
                            offset = (page - 1 ) * limit;
                        }

                        var query_vdo = "SELECT vdo.video_id2 AS video_id, vdo.brightcove_id, vdo.tournament_id, ";
                        query_vdo += " vdo.sport_id, vdo.embed_video, vdo.title, vdo.caption, vdo.countview, vdo.share, ";
                        query_vdo += " vdo.order_by, ss_highlight_news_mapping.types, DATE_FORMAT(vdo.create_date, '%Y-%m-%d %H:%i') AS create_date, ";
                        query_vdo += " DATE_FORMAT(vdo.lastupdate_date, '%Y-%m-%d %H:%i') AS lastupdate_date, ";
                        query_vdo += " picture.ref_type as picture_type, picture.folder, picture.file_name, ";
                        query_vdo += " tournament.tournament_name_th, tournament.tournament_name_en, tournament.url as tournament_url, tournament.dimension as tournamnet_dimension, ";
                        query_vdo += " sport.sport_name_th, sport.sport_name_en, sport.url as sport_url, sport.dimension as sport_dimension ";
                        query_vdo += " FROM `ss_video` AS vdo ";
                        query_vdo += " LEFT JOIN `ss_picture` AS picture ON vdo.video_id2 = picture.ref_id ";
                        query_vdo += " AND picture.ref_type = 4 AND picture.default = 1 ";
                        query_vdo += " LEFT JOIN ss_tournament tournament ON vdo.tournament_id = tournament.tournament_id ";
                        query_vdo += " LEFT JOIN ss_sport sport ON vdo.sport_id = sport.sport_id ";
                        query_vdo += " LEFT JOIN ss_highlight_news_mapping ON vdo.video_id2 = ss_highlight_news_mapping.news_id and ss_highlight_news_mapping.highlight_category_id = 1 ";
                        query_vdo += " WHERE (vdo.`status` = 1 AND vdo.`approve` = 1) AND vdo.`lang` = 'th' ";
                        query_vdo += extra_query;
                        query_vdo += " ORDER BY vdo.`lastupdate_date` DESC ";
                        query_vdo += " LIMIT " + offset + ", " + limit;

                        mysql_connection.query({
                            sql: query_vdo,
                            timeout: 2000
                        }, function(error, result) {

                            if (error) {
                                log.error("[500] list/news/getVideo/getListAllNews Service[getVideo]: " + error.stack);
                                callback();
                            } else {

                                if (utils.isEmptyObject(result)) {
                                    list_video = [];
                                    callback();
                                } else {

                                    data = result;
                                    for (var i in data) {
                                        var picType = 'vdo';
                                        var picture_size = {
                                            'fullsize': picType + '/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                            'size128': 'size128/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                            'size224': 'size224/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                            'size304': 'size304/' + data[i]['folder'] + '/' + data[i]['file_name'],
                                            'size640': 'size640/' + data[i]['folder'] + '/' + data[i]['file_name']
                                        };
                                        data[i].types = 'vdo';
                                        data[i].picture_size = picture_size;
                                    }
                                    list_video = data;
                                    callback();
                                }
                            }
                        });
                    }
                }
            });

        },
        function(callback) { // merge 2 object and sort date

            list_video.forEach((item, index) => { news_data.push(item) });
            data = news_data.sort((a, b) => {
                return new Date(b.lastupdate_date) - new Date(a.lastupdate_date);
            });
            callback();
        }
    ], function(error) {

        var jsonObj = utils.getJSONPaginationObject(200, "Success", data, param.page, param.page_total, param.row);
        if (error) {
            callback(500, error.stack);
        } else {
            callback(null, mysql_connection, param, key, jsonObj, redisCluster);
        }
    });
}

function getList(mysql_connection, param, key, redisCluster, callback) {

    var data = {};
    var local = param.is_local;

    var query_opt = "";
    if (param.is_ball == true) {
        query_opt = " AND ss_news.sport_id = 1 AND ss_news.is_local = " + local;
    } else {
        query_opt = " AND ss_news.sport_id <> 1 ";
    }

    var query = "SELECT count(news_id2) as row FROM ss_news WHERE (status=1 AND approve=1 AND lang='th') " + query_opt;
    mysql_connection.query({
        sql: query,
        timeout: 2000, //2 Sec.
    }, function(error, results) {

        if (error) {
            log.error("[500] list/news/getList/getListAllNews Service[getList]: " + error.stack);
            callback(500, error.stack);
            throw new Error(error.stack);
        } else {

            var resultObject = results[0];
            var row = resultObject["row"];
            param.row = row;

            var page_total = Math.ceil(row / param.limit);
            if (param.page >= page_total) {
                param.page = page_total;
                param.page_total = param.page;
            } else {
                param.page_total = page_total;
            }

            var offset = (param.page == 0) ? param.page : (param.page - 1) * param.limit;
            query = "SELECT news_id2 as news_id, ss_news.tournament_id, ss_news.sport_id, ss_news.icon_pic, ";
            query += " icon_vdo, ss_news.news_special_id, ss_ns.name as news_specail_name, headline, ss_news.title, ss_news.countview, ss_news.share, ";
            query += " DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%i') as create_date, ";
            query += " DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%i') as lastupdate_date, ";
            query += " DATE_FORMAT(ss_news.proof_date, '%d-%m-%Y %H:%i') AS proof_date, ";
            query += " DATE_FORMAT(ss_news.approve_date, '%d-%m-%Y %H:%i') AS approve_date, ";
            query += " ss_picture.folder, ss_picture.file_name, ss_picture.ref_type as picture_type, ";
            query += " ss_news.redirect_url, ss_news.order_by, ss_highlight_news_mapping.types, ";
            query += " ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ";
            query += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
            query += " FROM ss_news LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id` ";
            query += " AND (`ss_picture`.`ref_type` = 1 AND `ss_picture`.default = 1) ";
            query += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
            query += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
            query += " LEFT JOIN ss_highlight_news_mapping ON ss_news.news_id2 = ss_highlight_news_mapping.news_id and ss_highlight_news_mapping.highlight_category_id = 1 ";
            query += " LEFT JOIN ss_news_special ss_ns ON ss_news.news_special_id = ss_ns.news_special_id ";
            query += " WHERE ss_news.status=1 AND ss_news.approve=1 AND ss_news.lang='th' ";
            query += " AND ss_news.news_type_id = 1 " + query_opt;
            query += " ORDER BY `ss_news`.`lastupdate_date` DESC LIMIT " + offset + ", " + param.limit;

            mysql_connection.query({
                sql: query,
                timeout: 2000, //2 Sec.
            }, function(error, results) {
                data = results;

                if (error) {
                    log.error("[500] list/news/getList/getListAllNews Servcie[getList]: " + error.stack);
                    callback(500, error.stack);
                    throw new Error(error.stack);
                } else {

                    if (utils.isEmptyObject(data)) {
                        callback(501, "Data not found.");
                    } else { 

                        for (var i = 0; i < data.length; i++) {
                            var obj = data[i];
                            obj.thumbnail = obj.folder + "/" + obj.file_name;
                            data[i] = obj;

                            var data2 = data[i];
                            for (var j in data2) {
                                var picType = 'news';
                                var picture_size = {
                                    'fullsize': picType + '/' + data2['folder'] + '/' + data2['file_name'],
                                    'size128': 'size128/' + data2['folder'] + '/' + data2['file_name'],
                                    'size224': 'size224/' + data2['folder'] + '/' + data2['file_name'],
                                    'size304': 'size304/' + data2['folder'] + '/' + data2['file_name'],
                                    'size640': 'size640/' + data2['folder'] + '/' + data2['file_name']
                                };
                                data[i].picture_size = picture_size;
                            }
                        }

                        callback(null, mysql_connection, param, key, data, redisCluster);
                    }
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
                getVideo,
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
    
    var key = redis_key + param.is_ball + "-" + param.local + "-" + param.limit + "-" + param.page;
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
    var sport = "";
    var param = {};

    sport = req.query.sport;

    param.limit = req.params.item;
    param.page = req.params.page;
    param.local = req.params.local;
    param.clear_cache = false;

    if (sport == 'football') {
        param.is_ball = true;
    } else {
        param.is_ball = false;
    }

    if (req.params.local == 'th') {
        param.is_local = 1;
    } else {
        param.is_local = 0;
    }

    getDataFromRedis(res, param);

});

router.get('/:local/:item/:page/:clear_cache', function(req, res, next) {
    var sport = "";
    var param = {};

    sport = req.query.sport;

    param.limit = req.params.item;
    param.page = req.params.page;
    param.local = req.params.local;

    if (sport == 'football') {
        param.is_ball = true;
    } else {
        param.is_ball = false;
    }

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
