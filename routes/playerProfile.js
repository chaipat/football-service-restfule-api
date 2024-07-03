// *** Create 22/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var fs = require('fs');
var path = require('path');

var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'player-profile-';
var cache_timeout = 60; // 1 minute
var static_image_url = config.getStaticImageURL();
// var dir_name = "/app/siamsport.co.th/livescore/backend/public_html/uploads/player/"; //st
var dir_name = "/app/web/siamsport.co.th/livescore.siamsport.co.th/backend/uploads/player/"; //prod

function setData2Redis(mysql_connection, param, data, key, redisCluster, callback) {
    
    var value = JSON.stringify(data);
    if (redisCluster != null) {
        redisCluster.set(key, value, function(err, reply) {

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

function getDimension(mysql_connection, mysql_connection2, param, data, key, redisCluster, callback) {

    var tournament_id = param.leauge_id;
    var relate_video = [];
    var query = "SELECT st.tournament_id, st.`url` as tournament_url, st.`dimension` as tournament_dimension, sp.sport_id, sp.url as sport_url, sp.dimension as sport_dimension ";
    query += " FROM `ss_tournament` st LEFT JOIN ss_sport sp ON st.sport_id = sp.sport_id ";
    query += " WHERE st.livescore_id = ? ";

    mysql_connection2.query({
        sql: query,
        timeout: 2000,
        values: tournament_id
    }, function(error, result) {

        mysql_connection2.end();
        if (!utils.isEmptyObject(result) && result.length > 0) {
            data[0].dimension = result;    
        } else {
            result = [];
            data[0].dimension = result;
        }
        
        callback(null, mysql_connection, param, data, key, redisCluster);
    });
}

function getRelateVideo(mysql_connection, mysql_connection2, param, data, key, redisCluster, callback) {

    var relate_video = [];
    var query = "SELECT ss_video_player_mapping.video_id as id, ss_video.tournament_id, ss_video.sport_id, ";
    query += " ss_video.embed_video, ss_video.title, ss_video.countview, ss_video.share, ";
    query += " ss_video.shorturl, ss_video.order_by, ";
    query += " DATE_FORMAT(ss_video.create_date, '%d-%m-%Y %H:%m') as create_date, ";
    query += " DATE_FORMAT(ss_video.lastupdate_date, '%d-%m-%Y %H:%m') as lastupdate_date, ";
    query += " ss_picture.ref_type as picture_type, ss_picture.folder, ss_picture.file_name, ";
    query += " ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ";
    query += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
    query += " FROM ss_player ";
    query += " LEFT JOIN ss_video_player_mapping ON ss_video_player_mapping.player_id = ss_player.player_id ";
    query += " LEFT JOIN ss_video ON ss_video_player_mapping.video_id = ss_video.video_id2 ";
    query += " LEFT JOIN ss_picture ON ss_video_player_mapping.video_id = ss_picture.ref_id AND (ss_picture.ref_type =  4 AND ss_picture.default = 1) ";
    query += " LEFT JOIN ss_tournament ON ss_video.tournament_id = ss_tournament.tournament_id ";
    query += " LEFT JOIN ss_sport ON ss_video.sport_id = ss_sport.sport_id  ";
    query += " WHERE ss_player.livescore_id = ?";
    query += " ORDER BY ss_video_player_mapping.lastupdate_date DESC LIMIT 3 ";

    mysql_connection2.query({
        sql: query,
        timeout: 2000,
        values: param.player_id
    }, function(error, result) {

        for (var i = 0; i < result.length; i++) {

            var obj = result[i];
            obj.types = "vdo";
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

        data[0].relate_video = result;
        callback(null, mysql_connection, mysql_connection2, param, data, key, redisCluster);
    });

}

function getRelateNews(mysql_connection, param, data, key, redisCluster, callback) {

    var relate_news = [];
    query = "SELECT ss_player.player_id, ss_player.livescore_id, ss_news_player_mapping.news_id as id, ";
    query += " ss_news.tournament_id, ss_news.title, ss_news.sport_id, ss_news.icon_pic, ";
    query += " ss_news.icon_vdo, ss_news.news_special_id, ss_ns.name as news_special_name, ss_news.headline, ss_news.title, ss_news.countview, ";
    query += " ss_news.share, ss_news.comment_fb, ss_news.like_fb, ";
    query += " DATE_FORMAT(ss_news.create_date, '%Y-%m-%d %H:%m') as create_date, ";
    query += " DATE_FORMAT(ss_news.lastupdate_date, '%Y-%m-%d %H:%m') as lastupdate_date, ";
    query += " ss_picture.ref_type as picture_type, ss_picture.folder, ss_picture.file_name, ";
    query += " ss_news.redirect_url, ss_news.order_by, ss_tournament.tournament_name_th, ";
    query += " ss_tournament.tournament_name_en, ss_tournament.url as tournament_url, ss_tournament.dimension as tournament_dimension, ss_tournament.domain as domain, ";
    query += " ss_sport.sport_name_th, ss_sport.sport_name_en, ss_sport.url as sport_url, ss_sport.dimension as sport_dimension ";
    query += " FROM ss_player ";
    query += " LEFT JOIN ss_news_player_mapping ON ss_news_player_mapping.player_id = ss_player.player_id ";
    query += " LEFT JOIN ss_news ON ss_news_player_mapping.news_id = ss_news.news_id2 ";
    query += " LEFT JOIN ss_picture ON ss_news_player_mapping.news_id = ss_picture.ref_id ";
    query += " LEFT JOIN ss_tournament ON ss_news.tournament_id = ss_tournament.tournament_id ";
    query += " LEFT JOIN ss_sport ON ss_news.sport_id = ss_sport.sport_id ";
    query += " LEFT JOIN ss_news_special ss_ns ON ss_news.news_special_id = ss_ns.news_special_id ";
    query += " WHERE ss_player.livescore_id = ? ";
    query += " AND ss_news.status = 1 AND ss_news.approve = 1 AND ss_news.lang = 'th' ";
    query += " ORDER BY ss_news.lastupdate_date DESC LIMIT 5 ";

    var connection = config.getMySQLConnection();
    connection.connect(function(connectError) {

        if(connectError) {
            log.error("[500] playerProfile:getRelateNews - " + connectError.stack);
            callback(500, connectError.stack);
        } else {

            connection.query({
                sql: query,
                timeout: 2000,
                values: param.player_id
            }, function(error, result) {

                for (var i = 0; i < result.length; i++) {

                    var obj = result[i];
                    obj.types = "news";
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

                // callback(error, result);
                data[0].relate_news = result;
                callback(null, mysql_connection, connection, param, data, key, redisCluster);
            });
        }
    });
}

function getStatistic(mysql_connection, param, data, key, redisCluster, callback) {

    var results = [
        { 'id': 1, 'cup': "ลีก", 'is_cup': 0, 'is_international': 0, 'mod': 'AND' },
        { 'id': 2, 'cup': "ลีกคัพ", 'is_cup': 1, 'is_international': 0, 'mod': 'AND' },
        { 'id': 3, 'cup': "ลีกคัพอินเตอร์เนชั่นแนล", 'is_cup': 2, 'is_international': 1, 'mod': 'OR' }
    ];


    if (!utils.isEmptyObject(results) && results.length > 0) {

        async.eachSeries(results, function iterator(item, cb) {
            async.setImmediate(function() {
                var data_for_query = [];
                var query = "SELECT club_id, team_id, club_name, league_id, league, season, minutes, appearences, lineups, substitute_in, substitute_out, substitutes_on_bench, goals, yellowcards, yellowred, redcards, is_cup, is_international  ";
                query = query + " FROM sp_xml_player_statistic ";
                query = query + " WHERE player_id = ? AND (is_cup = ? " + item["mod"] + " is_international = ?) ORDER BY season DESC ";
                data_for_query.push(param.player_id);
                data_for_query.push(item["is_cup"]);
                data_for_query.push(item["is_international"]);

                mysql_connection.query({
                    sql: query,
                    timeout: 2000, //2 Sec.
                    values: data_for_query
                }, function(error, result) {

                    if (error) {
                        log.error("[500] Profile Service[] - getStatistic: " + error.stack);
                        cb(null, item);
                    } else {
                        if (!utils.isEmptyObject(results) && results.length > 0) {
                            item["league"] = result;
                        } else {
                            item["league"] = [];
                        }

                        cb(null, item);
                    }

                });
            });
        }, function done() {
            data[0].history = results;
            callback(null, mysql_connection, param, data, key, redisCluster);
        });


    } else {
        data[0].history = [];
        callback(null, mysql_connection, param, data, key, redisCluster);
    }
}

function getProfile(mysql_connection, param, key, redisCluster, callback) {
    
    var display_data = [];
    var query_data = param.player_id;

    var query_string = " SELECT sp_player_profile.profile_id, sp_player_profile.common_name, ";
    query_string += " sp_player_profile.name, sp_player_profile.name_th, sp_player_profile.firstname, ";
    query_string += " sp_player_profile.lastname, sp_player_profile.firstname_th, ";
    query_string += " sp_player_profile.lastname_th, sp_player_profile.category as full_position, sp_xml_team_squad.position as shot_position, sp_player_profile.teamid, sp_team.team_name as team, sp_team.team_name_en, ";
    query_string += " sp_xml_clear_leauge.leauge_id, sp_xml_clear_leauge.leauge_name, ";
    query_string += " sp_player_profile.nationality, DATE_FORMAT(sp_player_profile.birthdate, '%d-%m-%Y') as birthdate, ";
    query_string += " sp_player_profile.age, ";
    query_string += " sp_player_profile.height, sp_player_profile.weight, sp_player_profile.image, ";
    query_string += " sp_xml_team_squad.number, sp_xml_team_squad.appearences, ";
    query_string += " sp_xml_team_squad.goals, sp_xml_team_squad.assists, ";
    query_string += " sp_xml_team_squad.yellowcards, sp_xml_team_squad.yellowred, ";
    query_string += " sp_xml_team_squad.redcards FROM `sp_player_profile` ";
    query_string += " LEFT JOIN sp_xml_team_squad ON sp_player_profile.teamid = sp_xml_team_squad.team_id ";
    query_string += " AND sp_player_profile.profile_id = sp_xml_team_squad.player_id ";
    query_string += " LEFT JOIN sp_team ON sp_player_profile.teamid = sp_team.team_id ";
    query_string += " LEFT JOIN sp_xml_clear_leauge ON sp_team.league_id = sp_xml_clear_leauge.leauge_id ";
    query_string += " WHERE sp_player_profile.profile_id = ? ";

    try {
        mysql_connection.query({
            sql: query_string,
            timeout: 2000,
            values: query_data
        }, function(error, result) {

            if (error) {
                log.error("[500] detail/profile/playerProfile Service[getProfile]: " + error.stack);
                callback(500, error.stack);
            } else {

                if (!utils.isEmptyObject(result) && result.length > 0) {

                    param.leauge_id = result[0]["leauge_id"];

                    var path_file = path.join(dir_name + result[0]["teamid"] + '/' + param.player_id);

                    if (fs.existsSync(path_file)) {

                        fs.readFile(path_file, 'utf8', function(err, data) {
                            if (err) {
                                log.error("[500] Profile Service[image] - getProfile: " + err.stack);
                                callback(null, mysql_connection, param, result, key, redisCluster);
                            } else {

                                result[0]["image"] = data;
                                callback(null, mysql_connection, param, result, key, redisCluster);
                            }

                        });

                    } else {
                        result[0]["image"] = "Not exists player directory id: " + param.player_id;
                        callback(null, mysql_connection, param, result, key, redisCluster);
                    }

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
    var data = {};
    // var mysql_connection = config.getMySQLConnection();
    var mysql_connection = config.getLivescoreMySQLConnection();
    mysql_connection.connect(function(connectError) {

        if (connectError) {
            mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] detail/player/playerProfile Service[getDataFromMySQL]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
        } else {
            async.waterfall([
                async.apply(getProfile, mysql_connection, param, key, redisCluster),
                getStatistic,
                getRelateNews,
                getRelateVideo,
                getDimension,
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {
                    var output = [];
                    output[0] = result;
                    if (error == 200) {
                        utils.printJSON(res, utils.getJSONObject(200, "Success", result));
                    } else {

                        if (redisCluster != null) {
                            redisCluster.disconnect();
                            redisCluster = null;
                        }
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

    var key = redis_key + param.player_id;
    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {
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
                                redisCluster = null;
                            }

                        });

                        utils.printJSON(res, utils.getJSONObject(200, "Delete: " + key, null));
                    } else {
                        redisCluster.get(key, function(error, reply) {
                            if (error) {
                                log.error("[500] detail/player/playerProfile Service[redisCluster.get]: " + error.stack);
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else {
                                if (reply != "" && reply != undefined) {
                                    var json = [];
                                    json[0] = JSON.parse(reply);

                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
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
    });
}

/* GET users listing. */
router.get('/', function(req, res, next) {
    utils.printJSON(res, utils.getJSONObject(502, "Missing parameter.", null));
});

router.get('/:player_id', function(req, res, next) {
    var param = {};

    var id = parseInt(req.params.player_id);

    param.player_id = req.params.player_id;
    param.clear_cache = false;
    if (req.params.player_id != "") {
        getDataFromRedis(res, param);
    } else {
        utils.printJSON(res, utils.getJSONObject(501, "Invalid parameter.", null));
    }
});

router.get('/:player_id/:clear_cache', function(req, res, next) {
    var param = {};
    param.player_id = req.params.player_id;

    if (req.params.clear_cache == 'true') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }
    getDataFromRedis(res, param);
});

module.exports = router;
