var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var request = require('request');
var router = express.Router();
var cachePrefix = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName();

function setData2Redis(redisCluster, cacheKey, data, mysql_connection, callback) {

    var value = JSON.stringify(data);

    if (redisCluster != null) {
        redisCluster.set(cacheKey, value, function(err, reply) {

            if (!err) {
                redisCluster.expire(cacheKey, 60);
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

function getVideoList(redisCluster, cacheKey, bodyHeadline, headline, param, mysql_connection, callback) {

    if (param.special_id != "4") {
        
        headline.vdo = [];
        bodyHeadline.push(headline);
        var jsonObj = utils.getJSONPaginationObject(200, "Success", bodyHeadline, param.page, param.page_total, param.row, param.tournament_name_th, param.tournament_name_en, param.sport_name_th, param.sport_name_en);
        callback(null, redisCluster, cacheKey, jsonObj, mysql_connection);

    } else {
        //http://videoapi.siamsport.co.th/v1/home/category/13?siteId=1
        //http://sstv.siamsport.co.th/rss/list_video.php?page='+param.page+'&idtvp=253

        request('http://videoapi.siamsport.co.th/v1/home/category/32?siteId=1&page='+param.page,
            function(err, response, body) {
                var objectBody = {};
                var info = JSON.parse(body);

                if (!err && response.statusCode == 200) {

                    if (JSON.stringify(info.header) == "{}") {
                        headline.vdo = [];
                        bodyHeadline.push(headline);

                        var jsonObj = utils.getJSONPaginationObject(200, "Success", bodyHeadline, param.page, param.page_total, param.row, param.tournament_name_th, param.tournament_name_en, param.sport_name_th, param.sport_name_en);

                        callback(null, redisCluster, cacheKey, jsonObj, mysql_connection);
                    } else {
                        objectBody = info.body;
                        // objectBody = objectBody.slice(0, 2);

                        headline.vdo = objectBody;
                        bodyHeadline.push(headline);

                        var jsonObj = utils.getJSONPaginationObject(200, "Success", bodyHeadline, param.page, param.page_total, param.row, param.tournament_name_th, param.tournament_name_en, param.sport_name_th, param.sport_name_en);

                        callback(null, redisCluster, cacheKey, jsonObj, mysql_connection);
                    }
                } else {
                    headline.vdo = [];
                    bodyHeadline.push(headline);

                    var jsonObj = utils.getJSONPaginationObject(200, "Success", bodyHeadline, param.page, param.page_total, param.row, param.tournament_name_th, param.tournament_name_en, param.sport_name_th, param.sport_name_en);

                    callback(null, redisCluster, cacheKey, jsonObj, mysql_connection);
                }
            });
    }



}

function getMainList(redisCluster, cacheKey, bodyHeadline, headline, param, mysql_connection, callback) {

    var query_data = [];
    var special_id = param.special_id;

    query_data.push(special_id);

    var query = "SELECT count(news_id2) as row FROM ss_news WHERE (status=1 AND approve=1 AND lang='th') AND news_special_id = ? ";
    mysql_connection.query({
        sql: query,
        timeout: 2000,
        values: query_data
    }, function(error, result) {

        if (error) {
            log.error("[500] getListNewsSpecialId Service[get count row]: " + error.stack);
            callback(500, error.stack);
            throw new Error(error.stack);
        } else {
            var resultObject = result[0];
            var row = resultObject["row"];

            var page_total = Math.ceil(row / param.limit);
            var offset = (param.page == 0) ? param.page : (param.page - 1) * param.limit;

            var query_data = [];
            query_data.push(special_id);

            /*var query = "SELECT news_id2 as id, ss_news.tournament_id, ss_news.sport_id, ";
            query += " icon_pic, icon_vdo, headline, title, countview, share, ";
            query += " comment_fb, like_fb, DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%i') as create_date, ";
            query += " DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%i') as lastupdate_date, ";
            query += " ss_picture.ref_type as picture_type, ss_picture.folder, ss_picture.file_name, ";
            query += " redirect_url, order_by, ss_tournament.tournament_name_th, ";
            query += " ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ";
            query += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
            query += " FROM ss_news LEFT JOIN `ss_picture` ON `ss_news`.`news_id2` = `ss_picture`.`ref_id` ";
            query += " AND (`ss_picture`.`ref_type` = 1 AND `ss_picture`.default = 1) ";
            query += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
            query += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
            query += " WHERE ss_news.news_special_id = ? AND ss_news.status=1 AND ss_news.approve=1 ";
            query += " AND ss_news.lang='th' ";
            query += " ORDER BY `ss_news`.`lastupdate_date` DESC ";
            query += " LIMIT " + offset + ", " + param.limit;*/

            var query = "SELECT id, tournament_id, sport_id, icon_pic, icon_vdo, title, countview, share,";            
            query += " create_date, ";
            query += " lastupdate_date, ";
            query += " picture_type, folder, file_name, ";
            query += " redirect_url, order_by, tournament_name_th, ";
            query += " tournament_name_en, tournament_url, tournament_dimension, ";
            query += " sport_name_th, sport_name_en, sport_url, sport_dimension ";
            query += " FROM ss_view_news WHERE news_special_id = ? ";
            query += " LIMIT " + offset + ", " + param.limit;

            mysql_connection.query({
                sql: query,
                timeout: 2000,
                values: query_data
            }, function(error, result) {

                if (error) {
                    log.error("[500] getListNewsSpecialId Service [get data]: " + error.stack);
                    callback(500, error.stack);
                    throw new Error(error.stack);

                } else {

                    if (utils.isEmptyObject(result)) {
                        // callback(501, "Data not found.");
                        headline.news = [];
                        callback(null, redisCluster, cacheKey, bodyHeadline, headline, param, mysql_connection);
                    } else {
                        var resultObject2 = result[0];
                        var tournament_name_th = resultObject2["tournament_name_th"];
                        var tournament_name_en = resultObject2["tournament_name_en"];
                        var sport_name_th = resultObject2["sport_name_th"];
                        var sport_name_en = resultObject2["sport_name_en"];

                        for (var i = 0; i < result.length; i++) {
                            var obj = result[i];
                            obj.thumbnail = obj.folder + "/" + obj.file_name;
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

                        headline.news = result;

                        param.page_total = page_total;
                        param.row = row;
                        param.tournament_name_th = tournament_name_th;
                        param.tournament_name_en = tournament_name_en;
                        param.sport_name_th = sport_name_th;
                        param.sport_name_en = sport_name_en;
                        param.query = query;

                        callback(null, redisCluster, cacheKey, bodyHeadline, headline, param, mysql_connection);
                    }
                }
            });
        }
    });

}

function getDataFromMySQL(res, redisCluster, cacheKey, param) {
    var bodyHeadline = [];
    var headline = {};
    var mysql_connection = config.getMySQLConnection();

    mysql_connection.connect(function(connectionError) {

        if (connectionError) {
            mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] getListNewsSpecialId Service [MySQL connection error]: " + connectionError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectionError.stack, null));
        } else {

            async.waterfall([
                async.apply(getMainList, redisCluster, cacheKey, bodyHeadline, headline, param, mysql_connection),
                getVideoList,
                setData2Redis

            ], function(err, result) {

                mysql_connection.end();

                if (err) {
                    if (err == 200) {
                        utils.printJSON(res, result);
                    } else {
                        if (redisCluster != null) {
                            redisCluster.disconnect();
                            redisCluster = null;
                        }
                        utils.printJSON(res, utils.getJSONObject(err, result));
                    }
                } else {
                    utils.printJSON(res, result);
                }
            });

        }
    });


}

function getDataFromRedisCluster(res, clear_cache, param) {
    var cacheKey = cachePrefix + 'list-news-special_id-' + param.special_id + "-" +
        param.limit + "-" + param.page;
    var clearCache = clear_cache;
    var redisCluster = config.getRedisCluster();

    redisCluster.once('connect', function() {
        redisCluster.exists(cacheKey, function(err, reply) {

            if (err) {
                utils.printJSON(res, utils.getJSONObject(500, err.stack, null));
            } else {
                if (reply == true) {

                    if (clearCache == true) {
                        redisCluster.del(cacheKey, function(err) {

                            if (redisCluster != null) {
                                redisCluster.disconnect();
                                redisCluster = null;
                            }
                        });
                        utils.printJSON(res, utils.getJSONObject(200, "Delete : " + cacheKey, null));
                    } else {
                        redisCluster.get(cacheKey, function(err, reply) {

                            if (err) {
                                log.error("[500] getListNewsSpecialId Service [redisCluster.get]: " + err.stack);
                            } else {

                                if (reply != "" && reply != undefined) {

                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }
                                    utils.printJSON(res, JSON.parse(reply));
                                } else {
                                    getDataFromMySQL(res, redisCluster, cacheKey, param);
                                }
                            }
                        });
                    }
                } else {
                    getDataFromMySQL(res, redisCluster, cacheKey, param);
                }
            }
        })
    });

    redisCluster.once('error', function(err) {
        if (redisCluster != null) {
            redisCluster.disconnect();
            redisCluster = null;
        }
        getDataFromMySQL(res, redisCluster, cacheKey, param);
    });
}

/* GET users listing. */
router.get('/:special_id/:limit/:page', function(req, res, next) {
    var param = {};
    param.special_id = req.params.special_id;
    param.limit = req.params.limit;
    param.page = req.params.page;

    getDataFromRedisCluster(res, false, param);
});

router.get('/:special_id/:limit/:page/:clear_cache', function(req, res, next) {
    var param = {};
    param.special_id = req.params.special_id;
    param.limit = req.params.limit;
    param.page = req.params.page;

    if (req.params.clear_cache == 'clear') {
        getDataFromRedisCluster(res, true, param);
    } else {
        getDataFromRedisCluster(res, false, param);
    }
});

module.exports = router;
