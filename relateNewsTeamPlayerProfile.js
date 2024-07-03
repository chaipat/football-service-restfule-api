// *** Create 26/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-news-';
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
    var type = param.type;
    var query_data = [];
    var mysql_connection = config.getMySQLConnection();
    mysql_connection.connect(function(err) {

        if (err) {
            mysql_connection.end();
            log.error("[500] list/news/getList/relateNewsTeamPlayerProfile[getList]: " + err.stack);
            callback(500, error.stack);
        } else {
            query_data.push(param.id);

            query = "SELECT count(ss_news_" + type + "_mapping.news_id) as row ";
            query += " FROM ss_news_" + type + "_mapping LEFT JOIN ss_news ";
            query += " ON ss_news_" + type + "_mapping.news_id = ss_news.news_id2 ";
            query += " WHERE ss_news_" + type + "_mapping.status=1 AND (ss_news.status=1 AND approve=1 AND lang='th') ";
            query += " AND ss_news_" + type + "_mapping." + type + "_id = ? ";

            mysql_connection.query({
                sql: query,
                timeout: 2000, //2 Sec.
                values: query_data
            }, function(error, results) {

                if (error) {
                    mysql_connection.end();
                    log.error("[500] list/news/getList/relateNewsTeamPlayerProfile[getList]: " + error.stack);
                    callback(500, error.stack);
                    throw new Error(error.stack);
                } else {

                    var resultObject = results[0];
                    var row = resultObject["row"];

                    var page_total = Math.ceil(row / param.limit);
                    if (param.page >= page_total)
                        param.page = page_total;

                    var offset = (param.page == 0) ? param.page : (param.page - 1) * param.limit;


                    if (type == "player") {
                        query = "SELECT ss_player.player_id, ss_player.livescore_id, ss_news_player_mapping.news_id as id, ";
                        query += " ss_news.tournament_id, ss_news.title, ss_news.sport_id, ss_news.icon_pic, ";
                        query += " ss_news.icon_vdo, ss_news.headline, ss_news.title, ss_news.countview, ";
                        query += " ss_news.share, ss_news.comment_fb, ss_news.like_fb, ";
                        query += " DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%m') as create_date, ";
                        query += " DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%m') as lastupdate_date, ";
                        query += " ss_picture.ref_type as picture_type, ss_picture.folder, ss_picture.file_name, "
                        query += " ss_news.redirect_url, ss_news.order_by, ss_tournament.tournament_name_th, ";
                        query += " ss_tournament.tournament_name_en, ss_sport.sport_name_th, ss_sport.sport_name_en ";
                        query += " FROM ss_player ";
                        query += " LEFT JOIN ss_news_player_mapping ON ss_news_player_mapping.player_id = ss_player.player_id ";
                        query += " LEFT JOIN ss_news ON ss_news_player_mapping.news_id = ss_news.news_id2 ";
                        query += " LEFT JOIN ss_picture ON ss_news_player_mapping.news_id = ss_picture.ref_id ";
                        query += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
                        query += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
                        query += " WHERE ss_player.livescore_id = ? ";
                        query += " AND ss_news.status = 1 AND ss_news.approve = 1 AND ss_news.lang = 'th' ";
                        query += " ORDER BY ss_news.lastupdate_date DESC ";
                        query += " LIMIT " + offset + ", " + param.limit;
                    } else {
                        query = "SELECT ss_team.team_id, ss_team.liveteam_id, ss_news_team_mapping.news_id as id,";
                        query += " ss_news.tournament_id, ss_news.title, ss_news.sport_id, ss_news.icon_pic, ";
                        query += " ss_news.icon_vdo, ss_news.headline, ss_news.title, ss_news.countview, ";
                        query += " ss_news.share, ss_news.comment_fb, ss_news.like_fb, ";
                        query += " DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%m') as create_date, ";
                        query += " DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%m') as lastupdate_date, ";
                        query += " ss_picture.ref_type as picture_type, ss_picture.folder, ss_picture.file_name, ";
                        query += " ss_news.redirect_url, ss_news.order_by, ss_tournament.tournament_name_th, ";
                        query += " ss_tournament.tournament_name_en, ss_sport.sport_name_th, ss_sport.sport_name_en ";
                        query += " FROM ss_team ";
                        query += " LEFT JOIN ss_news_team_mapping ON ss_news_team_mapping.team_id = ss_team.team_id ";
                        query += " LEFT JOIN ss_news ON ss_news_team_mapping.news_id = ss_news.news_id2 ";
                        query += " LEFT JOIN ss_picture ON ss_news_team_mapping.news_id = ss_picture.ref_id ";
                        query += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
                        query += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
                        query += " WHERE ss_team.liveteam_id = ? ";
                        query += " AND ss_news.status = 1 AND ss_news.approve = 1 AND ss_news.lang = 'th' ";
                        query += " ORDER BY ss_news.lastupdate_date DESC ";
                        query += " LIMIT " + offset + ", " + param.limit;
                    }

                    mysql_connection.query({
                        sql: query,
                        timeout: 2000, //2 Sec.
                        values: query_data
                    }, function(error, results) {
                        mysql_connection.end();
                        if (error) {
                            log.error("[500] list/news/getList/relateNewsTeamPlayerProfile[getList]: " + error.stack);
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

                                var jsonObj = utils.getJSONPaginationCustomObject(200, "success", results, param.page, page_total, row, tournament_name_th, tournament_name_en, sport_name_th, sport_name_en, "appListNews");
                                var jsonStr = JSON.stringify(jsonObj);

                                for (var i = 0; i < results.length; i++) {
                                    var obj = results[i];
                                    obj.thumbnail = obj.folder + "/" + obj.file_name;
                                    obj.types = "news";
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

                                // if (param.page > page_total) {
                                //     results = [];
                                // }

                                var jsonObj = utils.getJSONPaginationCustomObject(200, "Success", results, param.page, page_total, row, tournament_name_th, tournament_name_en, sport_name_th, sport_name_en);
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

            log.error("[500] list/news/getList/relateNewsTeamPlayerProfile Service[getDataFromMySQL]: " + connectionError.stack);
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
    var key = redis_key + param.type + "-" + param.id + "-" + param.limit + "-" + param.page;

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
                                log.error("[500] list/news/getList/relateNewsTeamPlayerProfile Service[redisCluster.get]: " + err.stack);
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

router.get('/:type/:id/:item/:page', function(req, res, next) {
    var param = {};
    param.type = req.params.type; //team, player
    param.id = req.params.id;
    param.limit = req.params.item;
    param.page = req.params.page;
    param.clear_cache = false;

    getDataFromRedis(res, param);

});

router.get('/:type/:id/:item/:page/:clear_cache', function(req, res, next) {
    var param = {};
    param.type = req.params.type; //team, player
    param.id = req.params.id;
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
