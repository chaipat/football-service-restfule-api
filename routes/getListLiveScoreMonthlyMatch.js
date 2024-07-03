var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var dateFormat = require('dateformat');
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'livescore-monthly';
var cache_timeout = 5; // 1 minute
var errorCode = 500;


function setData2Redis(ls_mysql_connection, param, cacheKey, data, redisCluster, query_program_status, query_get_analytic, query_data, callback) {

    if (redisCluster != null) {
        redisCluster.set(cacheKey, data, function(err, reply) {

            if (!err) {
                redisCluster.expire(cacheKey, cache_timeout);
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

function getData2(ls_mysql_connection, param, cacheKey, redisCluster, callback) {

    var arrKickoff = [];
    var data = {};
    var query_data = "";
    var query_get_analytic = "";
    var query_program_status = " sp_program.status <> 0 ";

    if (param.select_year != "" && param.select_month != "") {
        query_data = " AND YEAR(sp_program.kickoff) = " + param.select_year + " ";
        query_data += " AND MONTH(sp_program.kickoff) = " + param.select_month + " ";
    }

    if (param.analytic == true) {
        query_get_analytic = " AND (sp_program.vision IS NOT NULL OR sp_program.predict IS NOT NULL OR sp_program.review IS NOT NULL)";
        query_get_analytic += " AND (sp_program.vision <> '' OR sp_program.predict <> '' OR sp_program.review <> '')";
    }

    async.series([
        function(callback) {
            var query = "";
            query = "SELECT DISTINCT sp_tournament.order, sp_tournament.tournament_id, sp_tournament.file_group as country, sp_tournament.tournament_name as tournament_name_th, sp_tournament.tournament_name_en, sp_tournament.short_name, sp_tournament.logo as tournament_logo, ";
            query += " sp_tournament.file_group, sp_tournament.commentaries, sp_tournament.standings ";
            query += " FROM sp_tournament ";
            query += " INNER JOIN sp_program ";
            query += " ON sp_tournament.tournament_id = sp_program.league_id ";
            query += " WHERE sp_tournament.status = 1 ";
            query += query_get_analytic;
            query += " ORDER BY sp_tournament.order ";

            ls_mysql_connection.query({
                sql: query,
                timeout: 2000
            }, function(error, result) {
                if (error) {
                    callback(error);
                } else {
                    data = result;
                    callback();
                }
            });
        },
        function(callback) {
            async.each(data, function(item, cb) {
                var tournament_id = item.tournament_id;
                var query = "";
                query = "SELECT DISTINCT DATE(sp_program.kickoff) as kickoff FROM sp_program ";
                query += " WHERE " + query_program_status + " AND sp_program.league_id = '" + tournament_id + "' ";
                query += query_data;
                query += " ORDER BY sp_program.kickoff ";

                ls_mysql_connection.query({
                    sql: query,
                    timeout: 2000
                }, function(error, result) {
                    if (error) {
                        cb(error);
                    } else {

                        for (var i in result) {
                            arrKickoff.push(dateFormat(result[i].kickoff, "yyyy-mm-dd"));
                        }

                        cb();
                    }
                });
            }, function(error) {
                if (error) {
                    callback(error);
                } else {
                    callback();
                }
            });
        },
        function(callback) {


            async.each(arrKickoff, function(item, cb) {


                var key = item;
                var query = "";
                var tournament_id = "";


                async.each(data, function(i, cb2) {

                    var objectData = {};
                    var arrayData = [];
                    var objectArray = [];

                    var tournament_id = i.tournament_id

                    query = 'SELECT p.program_id as match_id, p.league_id as tournament_id, p.hometeam_id, \
                    p.hometeam_title, ht.team_name_en as hometeam_title_en, p.hometeam_point as hometeam_score, \
                    p.awayteam_id, p.awayteam_title, at.team_name_en as awayteam_title_en, \
                    p.awayteam_point as awayteam_score, p.kickoff, p.status as match_status, \
                    p.channel1, p.channel2, sp_channel1.channel_icon as channel1_icon, \
                    sp_channel1.channel_name as channel1_name, sp_channel2.channel_icon as channel2_icon, \
                    sp_channel2.channel_name as channel2_name \
                    FROM sp_program p \
                    LEFT JOIN sp_channel as sp_channel1 ON p.channel1 = sp_channel1.channel_id \
                    LEFT JOIN sp_channel as sp_channel2 ON p.channel2 = sp_channel2.channel_id \
                    LEFT JOIN sp_team ht ON p.hometeam_id = ht.team_id \
                    LEFT JOIN sp_team at ON p.awayteam_id = at.team_id \
                    WHERE p.league_id = ' + tournament_id + ' AND DATE(kickoff) = "' + key + '" \
                    AND p.status <> 0';

                    ls_mysql_connection.query({
                        sql: query,
                        timeout: 2000
                    }, function(error, result) {
                        if (error) {
                            cb2(error);
                        } else {

                            if (utils.isEmptyObject(result)) {
                                cb2(error);
                            } else {

                                var matchKey = 'match';

                                /*
                                for result push into array.
                                end for push array into object for key, value.
                                push object into final array.
                                i['match'] = final array.
                                */

                                

                                objectData = {
                                    [key]: result };


                                objectArray.push(objectData);
                                // arrayData.push(objectArray);

                                // async.each(arrayData, function(item3, cb3) {

                                //     i[matchKey] = item3;

                                //     cb3();
                                // }, function(error) {
                                //     if (error) {
                                //         cb2(error);
                                //     } else {
                                //         cb2();
                                //     }
                                // });

                                i['match'] = objectArray;

                                cb2();

                            }

                        }
                    });
                }, function(error) {

                    if (error) {
                        cb(error);
                    } else {
                        cb();
                    }
                });
            }, function(error) {
                if (error) {
                    callback(error);
                } else {
                    callback();
                }
            });
        }

    ], function(error) {

        if (error) {
            callback(errorCode, error.stack);
        } else {
            callback(null, ls_mysql_connection, param, cacheKey, data, redisCluster, query_program_status, query_get_analytic, query_data);
        }
    });

}

function getDataFromMySQL(res, param, cacheKey, redisCluster) {

    var ls_mysql_connection = config.getLivescoreMySQLConnection();
    ls_mysql_connection.connect(function(connectionError) {

        if (connectionError) {

            ls_mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] getListLiveScoreMonthlyMatch Service [SQL connection]: " + connectionError.stack);
            utils.printJSON(res, utils.getJSONObject(errorCode, connectionError.stack, null));
        } else {
            async.waterfall([
                async.apply(getData2, ls_mysql_connection, param, cacheKey, redisCluster),
                // getMatchDay,
                setData2Redis
            ], function(error, result) {



                ls_mysql_connection.end();

                if (error) {
                    if (error == 200) {
                        utils.printJSON(res, utils.getJSONObject(200, 'success', result));
                    } else {

                        if (redisCluster != null) {
                            redisCluster.disconnect();
                            redisCluster = null;
                        }
                        utils.printJSON(res, utils.getJSONObject(error, result));
                    }
                } else {
                    utils.printJSON(res, utils.getJSONObject(200, 'success', result));
                }
            });
        }
    });

}

function getDataFromRedisCluster(cacheKey, res, param, clear_cache) {
    var redisCluster = config.getRedisCluster();

    redisCluster.once('connect', function() {

        redisCluster.exists(cacheKey, function(err, reply) {
            if (err) {
                log.error("[500] getListLiveScoreMonthlyMatch Service [redis exists error]: " + err.stack);
                utils.printJSON(res, utils.getJSONObject(errorCode, err.stack, null));
            } else {

                if (reply == true) {

                    if (param.clear_cache == true) {
                        redisCluster.del(cacheKey, function(error) {

                            if (redisCluster != null) {
                                redisCluster.disconnect;
                                redisCluster = null;
                            }
                            utils.printJSON(res, utils.getJSONObject(200, "Delete: " + cacheKey, null));
                        });
                    } else {
                        redisCluster.get(cacheKey, function(err, reply) {

                            if (err) {
                                log.error("[500] getListLiveScoreMonthlyMatch Service [redisCluster.get]: " + err.stack);
                                getDataFromMySQL(res, param, cacheKey, redisCluster);
                            } else {

                                if (reply != "" && reply != undefined) {
                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }

                                    utils.printJSON(res, utils.getJSONObject(200, 'redis', JSON.parse(reply)));
                                } else {
                                    getDataFromMySQL(res, param, cacheKey, redisCluster);
                                }
                            }
                        });
                    }
                } else {
                    getDataFromMySQL(res, param, cacheKey, redisCluster);
                }
            }
        });
    });
}

/* GET users listing. */
router.get('/', function(req, res, next) {
    utils.printJSON(res, utils.getJSONObject(502, "Missing parameter.", null));
});

router.post('/', function(req, res, next) {
    var param = {};
    param.analytic = false;
    param.select_year = "";
    param.select_month = "";
    param.clear_cache = false;

    var cacheKey = redis_key;
    var raw_json = null;
    var headers = req.headers;

    if (headers["content-type"] === 'application/json') {
        try {
            raw_json = req.body;

            if (utils.hasKeyAndValue(raw_json, "analytic") && (raw_json["analytic"] == true || raw_json["analytic"] == "true")) {
                param.analytic = true;
            }

            if (utils.hasKeyAndValue(raw_json, "select_year") && (raw_json["select_year"] != "")) {
                param.select_year = raw_json["select_year"];
            }

            if (utils.hasKeyAndValue(raw_json, "select_month") && (raw_json["select_month"] != "")) {
                param.select_month = raw_json["select_month"];
            }

            if (utils.hasKeyAndValue(raw_json, "clear_cache") && (raw_json["clear_cache"] == true || raw_json["clear_cache"] == "true")) {
                param.clear_cache = true;
            }

            getDataFromRedisCluster(cacheKey, res, param, false);

        } catch (e) {
            utils.printJSON(res, utils.getJSONObject(errorCode, e.stack, null));
        }
    } else {
        utils.printJSON(res, utils.getJSONObject(errorCode, 'Wrong post format', null));
    }

});


module.exports = router;
