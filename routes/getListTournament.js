// *** Create 26/12/2016. ta ***

var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-tournament-';
var cache_timeout = 60; // 1 minute


function setData2Redis(mysql_connection, param, key, data, redisCluster, callback) {
    
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

function getList(mysql_connection, param, key, redisCluster, callback) {

    var tmp_page = param.page;
    if (param.id == 'all') {

        var query = "SELECT COUNT(tournament_id) as row FROM `ss_tournament` WHERE status = 1 ";
        mysql_connection.query({
            sql: query,
            timeout: 2000, //2 Sec.
        }, function(error, results) {

            if (error) {
                log.error("[500] list/tournament/getList/getListTournament Service[getList]: " + error.stack);
                callback(500, error.stack);
                throw new Error(error.stack);
            } else {

                var resultObject = results[0];
                var row = resultObject["row"];

                var page_total = Math.ceil(row / param.limit);
                if (param.page >= page_total)
                    param.page = page_total;

                var offset = (param.page == 0) ? param.page : (param.page - 1) * param.limit;

                query = "SELECT tournament.`tournament_id`, tournament.`livescore_id`, tournament.`sport_id`, ";
                query += " tournament.`country_id`, tournament.`tournament_name_th`, tournament.`tournament_name_en`, ";
                query += " sport.sport_name_th, sport.sport_name_en, tournament.`url`, tournament.`dimension`, tournament.domain as domain, ";
                query += " tournament.`short_name`, tournament.`color`, tournament.`domain`, tournament.`all_sport`, ";
                query += " tournament.`is_national`, tournament.`is_cup`, tournament.`orderby`, tournament.`status`, ";
                query += " DATE_FORMAT(tournament.`create_date`, '%d-%m-%Y %H:%m') as create_date, DATE_FORMAT(tournament.`lastupdate_date`, '%d-%m-%Y %H:%m') as lastupdate_date ";
                query += " FROM `ss_tournament` tournament LEFT JOIN ss_sport sport ON tournament.`sport_id` = sport.`sport_id` ";
                query += " WHERE tournament.`status` = 1 ORDER BY tournament.`orderby` ASC ";
                query += " LIMIT " + offset + ", " + param.limit;

                mysql_connection.query({
                    sql: query,
                    timeout: 2000, //2 Sec.
                }, function(error, results) {

                    if (error) {
                        log.error("[500] list/tournament/getList/getListTournament Servcie[getList]: " + error.stack);
                        callback(500, error.stack);
                        throw new Error(error.stack);
                    } else {
                        if (utils.isEmptyObject(results)) {
                            callback(501, "Data not found.");
                        } else { // Have Data;

                            if (tmp_page > page_total) {
                                results = [];
                                var jsonObj = utils.getJSONPaginationObject(200, "success", results, param.page, page_total, row, "appListTournament");
                            } else {
                                var jsonObj = utils.getJSONPaginationObject(200, "success", results, param.page, page_total, row, "appListTournament");
                            }

                            callback(null, mysql_connection, param, key, jsonObj, redisCluster);
                        }
                    }
                });
            }
        });

    } else {

        var query_data = [];
        query_data.push(param.id);
        var query = "SELECT tournament.`tournament_id`, tournament.`livescore_id`, tournament.`sport_id`, ";
        query += " tournament.`country_id`, tournament.`tournament_name_th`, tournament.`tournament_name_en`, ";
        query += " sport.sport_name_th, sport.sport_name_en, tournament.`url`, tournament.`dimension`, tournament.domain as domain, ";
        query += " tournament.`short_name`, tournament.`color`, tournament.`domain`, tournament.`all_sport`, ";
        query += " tournament.`is_national`, tournament.`is_cup`, tournament.`orderby`, tournament.`status`, ";
        query += " DATE_FORMAT(tournament.`create_date`, '%d-%m-%Y %H:%m') as create_date, DATE_FORMAT(tournament.`lastupdate_date`, '%d-%m-%Y %H:%m') as lastupdate_date ";
        query += " FROM `ss_tournament` tournament LEFT JOIN ss_sport sport ON tournament.`sport_id` = sport.`sport_id` ";
        query += " WHERE tournament.tournament_id = ? AND tournament.`status` = 1 ORDER BY tournament.`orderby` ASC ";

        mysql_connection.query({
            sql: query,
            timeout: 2000,
            values: query_data
        }, function(error, results) {

            if (error) {
                log.error("[500] list/tournament/getList/getListTournament Servcie[getList]: " + error.stack);
                callback(500, error.stack);
                throw new Error(error.stack);
            } else {
                if (utils.isEmptyObject(results)) {
                    callback(501, "Data not found.");
                } else {
                    callback(null, mysql_connection, param, key, results, redisCluster);
                }
            }
        });
    }
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

            log.error("[500] list/tournament/getList/getListTournament Service[getDataFromMySQL]: " + connectionError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectionError.stack, null));
        } else {
            async.waterfall([
                async.apply(getList, mysql_connection, param, key, redisCluster),
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {

                    if (error == 200) {
                        if (param.id == 'all') {
                            utils.printJSON(res, result);
                        } else {
                            utils.printJSON(res, utils.getJSONObject(200, "Success", result));
                        }

                    } else {
                        if (param.id == 'all') {
                            utils.printJSON(res, result);
                        } else {

                            if (redisCluster != null) {
                                redisCluster.disconnect();
                                redisCluster = null;
                            }
                            utils.prntJSON(res, utils.getJSONObject(error, result, null));
                        }
                    }

                } else {
                    if (param.id == 'all') {
                        utils.printJSON(res, result);
                    } else {
                        utils.printJSON(res, utils.getJSONObject(200, "Success", result));
                    }
                }
            });
        }
    });
}

function getDataFromRedis(res, param) {
    
    var key;
    if (param.page == undefined) {
        key = redis_key + param.id
    } else {
        key = redis_key + param.id + "-" + param.page;
    }

    var redisCluster = config.getRedisCluster();
    redisCluster.once('connect', function() {

        try {
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
                                    log.error("[500] list/tournament/getList/getListTournament Service[redisCluster.get]: " + err.stack);
                                    getDataFromMySQL(res, redisCluster, param, key);
                                } else {
                                    if (reply != "" && reply != undefined) {

                                        var value = JSON.parse(reply);

                                        if (redisCluster != null) {
                                            redisCluster.disconnect();
                                            redisCluster = null;
                                        }

                                        if (param.id == 'all') {
                                            utils.printJSON(res, value);
                                        } else {
                                            utils.printJSON(res, utils.getJSONObject(200, "Redis", value));
                                        }
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

        } catch (err) {

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            getDataFromMySQL(res, redisCluster, param, key);
        }
    });

    redisCluster.once('error', function(err) {
        if (redisCluster != null) {
            redisCluster.disconnect();
            redisCluster = null;
        }
        getDataFromMySQL(res, redisCluster, param, key);
    });
}

/* GET users listing. */

router.get('/', function(req, res, next) {
    var param = {};
    var id;
    var cache;
    var page, limit;

    id = req.query.id;
    cache = req.query.cache;
    page = req.query.page;
    limit = req.query.limit;

    if (id == undefined) {
        param.id = 'all'
    } else {
        param.id = id;
    }
    param.page = page;
    param.limit = limit;

    if (cache == 'clear') {
        param.clear_cache = true;
    } else {
        param.clear_cache = false;
    }

    getDataFromRedis(res, param);
});


module.exports = router;
