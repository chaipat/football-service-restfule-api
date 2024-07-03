var express = require('express');
var config = require('../config/index')
var utils = require('../utils/index');
var log = require('../logging/index');
var async = require("async");
var dateFormat = require('dateformat');
var router = express.Router();
var redis_key = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName() + 'list-all-program';
var static_image_url = config.getStaticImageURL();
var cache_timeout = 60; // 1 minute


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

function getProgram(mysql_connection, param, key, redisCluster, callback) {
    var data = {};
    var prevMatch = [];
    var nextMatch = [];
    var local = [];
    var arraySportName = [];

    async.series([
            function(callback) { //previous match
                var query = "SELECT * FROM ( SELECT DISTINCT DATE(date) as program FROM ss_program ";
                query += " WHERE status = 1 AND DATE(date) BETWEEN DATE(DATE_SUB(NOW(), INTERVAL 90 DAY)) ";
                query += " AND DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)) ";
                query += " ORDER BY program DESC LIMIT 2) AS program ";

                mysql_connection.query({
                    sql: query,
                    timeout: 2000
                }, function(err, result) {

                    if (err) {
                        callback(err);
                    } else {

                        result.sort(function(a, b) {
                            return new Date(a.program) - new Date(b.program);
                        });

                        for (var i in result) {
                            prevMatch.push(dateFormat(result[i].program, "yyyy-mm-dd"));
                        }
                        callback();
                    }
                });
            },
            function(callback) { //next match
                var query = "SELECT DISTINCT DATE(date) as program FROM ss_program WHERE status = 1 AND DATE(date) ";
                query += " BETWEEN DATE(NOW()) AND DATE(DATE_ADD(NOW(), INTERVAL 90 DAY)) ";
                query += " ORDER by program LIMIT 3 ";

                mysql_connection.query({
                    sql: query,
                    timeout: 2000
                }, function(err, result) {

                    if (err) {
                        callback(err);
                    } else {
                        for (var i in result) {
                            nextMatch.push(dateFormat(result[i].program, "yyyy-mm-dd"));

                        }
                        callback();
                    }
                });
            },
            function(callback) { //get local(1) or inter(0) on previous match.
                async.each(prevMatch, function(item, cb) {
                    var key = "";
                    key = item;

                    var query = "SELECT DISTINCT is_local";
                    query += " FROM ss_program WHERE status = 1 AND DATE(date) = '" + item + "' ";

                    mysql_connection.query({
                        sql: query,
                        timeout: 2000,
                    }, function(err, result) {

                        if (err) {
                            cd(err);
                        } else {

                            var objArray = {};
                            var arrayIsLocal = [];
                            objArray['tmp'] = new Array();
                            arrayIsLocal.push(objArray);

                            data[key] = arrayIsLocal;
                            cb();
                        }
                    });
                }, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }
                });
            },
            function(callback) { //get local(1) or inter(0) on next match.
                async.each(nextMatch, function(item, cb) {

                    var key = item;
                    var query = "SELECT DISTINCT is_local ";
                    query += " FROM ss_program WHERE status = 1 AND DATE(date) = '" + item + "' ";

                    mysql_connection.query({
                        sql: query,
                        timeout: 2000,
                    }, function(err, result) {

                        if (err) {
                            cb(err);
                        } else {

                            var objArray = {};
                            var arrayIsLocal = [];
                            objArray['tmp'] = new Array();
                            arrayIsLocal.push(objArray);

                            data[key] = arrayIsLocal;

                            cb();
                        }
                    });
                }, function(err) {

                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }
                });
            },
            function(callback) {
                var local_id = "";
                async.forEachOf(data, function(item, key, cb) {
                        var dayProgram = key;

                        async.each(item, function(i, cb2) {

                                var query = "SELECT p.`program_id2` AS program_id, p.`st_id`, p.`ts_id`, ";
                                query += " p.`channel_id`, p.`sport_id`, p.`se_id`, p.`sse_id`, p.`is_local`, ";
                                query += " p.`channel`, s.`sport_name_th`, s.`sport_name_en`, p.`sport_icon`, ";
                                query += " p.`lang`, p.`date`, p.`time`, p.`time2`, p.`title`, p.`description`, ";
                                query += " p.`url`, p.`picture`, p.`round`, p.`thai_flag`, p.`medal_round`, ";
                                query += " p.`status`, DATE_FORMAT(p.`create_date`, '%d-%m-%Y %H:%m') AS create_date, ";
                                query += " DATE_FORMAT(p.`lastupdate_date`, '%d-%m-%Y %H:%m') AS lastupdate_date ";
                                query += " FROM ss_program p LEFT JOIN ss_sport s ON p.sport_id = s.sport_id ";
                                query += " WHERE p.status = 1 AND DATE(p.date) = '" + dayProgram + "' ORDER by date ASC, time ASC ";

                                mysql_connection.query({
                                    sql: query,
                                    timeout: 2000
                                }, function(err, result) {
                                    if (err) {
                                        cb2(err);
                                    } else {
                                        var objArrayThai = [];
                                        var objArrayInter = [];
                                        for (var j in result) {

                                            if (result[j].is_local == 1) {
                                                objArrayThai.push(result[j]);
                                                i['thai'] = objArrayThai;
                                            } else {
                                                objArrayInter.push(result[j]);
                                                i['inter'] = objArrayInter;
                                            }
                                        }
                                        cb2();
                                    }
                                });
                            },
                            function(err) {
                                if (err) {
                                    cb(err);
                                } else {
                                    cb();
                                }
                            });
                    },
                    function(err) {
                        if (err) {
                            callback(err);
                        } else {
                            callback();
                        }
                    });
            }
        ],
        function(error) {
            if (error) {
                callback(error.message);
            } else {
                callback(null, mysql_connection, param, data, key, redisCluster);
            }
        });
}

function getDataFromMySQL(res, redisCluster, param, key) {
    var mysql_connection = config.getMySQLConnection();

    mysql_connection.connect(function(connectError) {

        if (connectError) {
            mysql_connection.end();

            if (redisCluster != null) {
                redisCluster.disconnect();
                redisCluster = null;
            }

            log.error("[500] detailNews Service[MySQL connection]: " + connectError.stack);
            utils.printJSON(res, utils.getJSONObject(500, connectError.stack, null));
        } else {
            async.waterfall([
                async.apply(getProgram, mysql_connection, param, key, redisCluster),
                setData2Redis,
            ], function(error, result) {

                mysql_connection.end();

                if (error) {

                    var output = [];
                    output[0] = result;

                    if (error == 200) {
                        utils.printJSON(res, utils.getJSONPaginationObject(200, "Success", output, null, null, null, key));
                    } else {
                        utils.printJSON(res, utils.getJSONObject(error, output, null));
                    }
                } else {
                    var output = [];
                    output[0] = result;

                    utils.printJSON(res, utils.getJSONPaginationObject(200, "Success", output, null, null, null, key));
                }
            });
        }
    });

}

function getDataFromRedis(res, param) {
    var key = redis_key;
    var redisCluster = config.getRedisCluster();

    redisCluster.once('connect', function() {
        redisCluster.exists(key, function(err, reply) {
            if (err) {
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
                                log.error("[500] listProgramAll Service[redisCluster.get]: " + error.stack);
                                getDataFromMySQL(res, redisCluster, param, key);
                            } else {
                                if (reply != "" && reply != undefined) {
                                    var json = [];
                                    json[0] = JSON.parse(reply);

                                    if (redisCluster != null) {
                                        redisCluster.disconnect();
                                        redisCluster = null;
                                    }

                                    utils.printJSON(res, utils.getJSONPaginationObject(200, "Redis", json, null, null, null, key));
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
