var express = require('express');
var sortObject = require('sort-object');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var request = require('request');
var dateFormat = require('dateformat');
var async = require("async");
var mysql = require('mysql');
var fs = require('fs');

var mysqlModule = require('./mysqlModule');
var redisCluster = config.getRedisCluster();
var redisCaching = require('./redisCaching');
var cacheKeyPrefix = config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName();

var livescoreModule = livescoreModule.prototype;

function livescoreModule() {

}

livescoreModule.getTournament = function(req, res, next) {
    var tournamentId = req.query.tournamentId;
    var teamName = req.query.teamName;
    var lang = req.query.lang;
    var query = '';
    var fieldTeamName = '';

    if (tournamentId === '' || typeof tournamentId === 'undefined' || isNaN(tournamentId)) {
        return utils.printJSON(res, utils.getJSONObject(400, 'input data fail', null));

    }

    if (lang === '' || typeof lang === 'undefined') {
        lang = 'en';
    }

    if (lang === 'en') {
        fieldTeamName = 'team_name_en';
    } else {
        fieldTeamName = 'team_name';
    }

    if (teamName === '' || typeof teamName === 'undefined') {
        query = 'SELECT team_id, league_id, team_name, team_name_en \
    FROM sp_team \
    WHERE league_id = ' + tournamentId;
    } else {
        query = 'SELECT team_id, league_id, team_name, team_name_en \
    FROM sp_team \
    WHERE league_id = ' + tournamentId + ' and ' + fieldTeamName + ' like "%' + teamName + '%"';
    }

    mysqlModule.getDataLivescore(query, function(error, result) {

        if (error) {
            return utils.printJSON(res, utils.getJSONObject(500, { "status": "fail", "reason": error.stack }, null));
        } else {
            if (utils.isEmptyObject(result)) {
                return utils.printJSON(res, utils.getJSONObject(404, { "status": "data not found" }, result));
            } else {
                return utils.printJSON(res, utils.getJSONObject(200, { "status": "success" }, result));
            }
        }

    });

};

livescoreModule.getPlayerList = function(req, res, next) {
    var teamId = req.params.teamid;
    var query = '';

    if (teamId === '' || typeof teamId === 'undefined' || isNaN(teamId)) {
        return utils.printJSON(res, utils.getJSONObject(400, 'input data fail', null));
    }

    var connection = config.getLivescoreMySQLConnection();

    query = 'SELECT profile_id, teamid as team_id, firstname, lastname, name, name_th FROM sp_player_profile WHERE teamid = ' + teamId;

    mysqlModule.getDataLivescore(query, function(error, result) {

        if (error) {
            return utils.printJSON(res, utils.getJSONObject(500, { "status": "fail", "reason": error.stack }, null));
        } else {
            if (utils.isEmptyObject(result)) {
                return utils.printJSON(res, utils.getJSONObject(404, { "status": "data not found" }, result));
            } else {
                return utils.printJSON(res, utils.getJSONObject(200, { "status": "success" }, result));
            }
        }

    });
};

livescoreModule.getPlayer = function(req, res, next) {
    var fname = req.query.fname;
    var lname = req.query.lname;
    var lang = req.query.lang;
    var query = '';
    var fnameField = '';
    var lnameField = '';

    if ((fname === '' || typeof fname === 'undefined') || (lname === '' || typeof lname === 'undefined')) {
        return utils.printJSON(res, utils.getJSONObject(400, 'input data fail', null));
    }

    if (lang === '' || typeof lang === 'undefined') {
        lang = 'en';
    }

    if (lang === 'en') {
        fnameField = 'firstname';
        lnameField = 'lastname';
    } else {
        fnameField = 'firstname_th';
        lnameField = 'lastname_th';
    }

    var connection = config.getLivescoreMySQLConnection();

    query = 'SELECT profile_id, teamid as team_id, firstname, lastname, name, name_th \
  FROM sp_player_profile \
  WHERE ' + fnameField + ' LIKE "%' + fname + '%" \
  AND ' + lnameField + ' LIKE "%' + lname + '%"';

    mysqlModule.getDataLivescore(query, function(error, result) {

        if (error) {
            return utils.printJSON(res, utils.getJSONObject(500, { "status": "fail", "reason": error.stack }, null));
        } else {
            if (utils.isEmptyObject(result)) {
                return utils.printJSON(res, utils.getJSONObject(404, { "status": "data not found" }, result));
            } else {
                return utils.printJSON(res, utils.getJSONObject(200, { "status": "success" }, result));
            }
        }

    });

};

livescoreModule.getTopChart = function(req, res, next) {

    var topchart = req.params.topChartType;
    var tournamentId = req.params.tournamentId;
    var clearCache = req.query.clearCache;
    var response_code = 200;
    var data = {};
    var players = {};
    var playerInfo = {};
    //var player_path_file = '/app/siamsport.co.th/livescore/backend/public_html/uploads/player/'; // staging
    var player_path_file = '/app/web/siamsport.co.th/livescore.siamsport.co.th/backend/uploads/player/';
    var dataField;
    var dataTable;
    var joinIdPlayer;
    var joinIdTeam;

    if (isNaN(tournamentId)) {
        return utils.printJSON(res, utils.getJSONObject(400, { 'status': 'wrong parameter' }, null));

    } else {
        var cacheKey = cacheKeyPrefix + 'category-livescore-' + topchart + '-' + tournamentId;
    }


    if (clearCache) {

        redisCaching.deleteCache(res, cacheKey, function(error, reply) {
            if (error) {
                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
            } else {
                if (reply) {
                    return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cache deleted", "cache_key": cacheKey }, null));
                } else {
                    return utils.printJSON(res, utils.getJSONObject(200, { 'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.' }, null));
                }
            }

        });

    } else {
        redisCaching.cacheExist(res, cacheKey, function(error, reply) {

            if (error) {

                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

                if (reply) {

                    redisCaching.getCache(res, cacheKey, function(error, result) {

                        if (error) {

                            return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

                        } else {

                            var json = JSON.parse(result);
                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cached redis", "cache_key": cacheKey }, json));
                        }

                    });

                } else {

                    async.series([

                        function(callback) { // get top scorer or top assist

                            if (topchart == 'topscorers') {
                                dataField = 'ts.pos, ts.tournament_id, ts.tournament_name, ts.player_id, ts.player_name, ts.team_id, \
                ts.goals, ts.penalty_goals,';
                                dataTable = 'sp_xml_topscorers ts';
                                joinIdPlayer = 'ts.player_id';
                                joinIdTeam = 'ts.team_id';

                            } else if (topchart == 'topassist') {
                                dataField = 'ta.pos, ta.tournament_id, ta.tournament_name, ta.player_id, ta.player_name, ta.team_id, \
                ta.assists,';
                                dataTable = 'sp_xml_topassist ta';
                                joinIdPlayer = 'ta.player_id';
                                joinIdTeam = 'ta.team_id';
                            }


                            var query = 'SELECT  ' + dataField + '\
              pf.name_th as player_name, pf.name as player_name_en, \
              pf.ss_id, pf.position, \
              t.team_name as team, t.team_name_en as team_en, t.logo \
              FROM ' + dataTable + '\
              LEFT JOIN sp_player_profile pf \
              ON  ' + joinIdPlayer + ' = pf.profile_id \
              LEFT JOIN sp_team t \
              ON ' + joinIdTeam + ' = t.team_id \
              WHERE tournament_id = ' + tournamentId + ' \
              ORDER BY pos LIMIT 25';

                            mysqlModule.getDataLivescore(query, function(error, result) {
                                if (error) return callback(error);

                                if (utils.isEmptyObject(result)) {
                                    response_code = 404;
                                    error = new Error(topchart + ' data not found');
                                    callback(error);
                                } else {
                                    players = result;

                                    async.each(players, function(item, cb) {
                                        var key = item.pos;
                                        playerInfo[key] = item;

                                        var image_path = player_path_file + playerInfo[key].team_id + '/' + playerInfo[key].player_id;


                                        fs.readFile(image_path, 'utf8', function(err, data) { // get player image
                                            if (err) {
                                                playerInfo[key].image = 'error:' + image_path;

                                            } else {
                                                playerInfo[key].image = data;
                                            }
                                        });

                                        var dataFlag = '';

                                        if (topchart == 'topscorers') {
                                            dataField = 'mp.goals as match_goals,';
                                            dataFlag = 'mp.goals';

                                        } else if (topchart == 'topassist') {
                                            dataField = 'mp.assists as match_assists,';
                                            dataFlag = 'mp.assists';
                                        }

                                        var query = 'SELECT ' + dataField + ' \
                        pg.program_id as match_id, pg.fix_id, pg.hometeam_id, pg.hometeam_title, \
                        ht.team_name_en as hometeam_title_en, pg.awayteam_id, pg.awayteam_title, \
                        at.team_name_en as awayteam_title_en, pg.hometeam_point as hometeam_score, pg.awayteam_point as awayteam_score, \
                        pg.kickoff, pg.status as match_status \
                        FROM sp_xml_match_player_statistic mp\
                        LEFT JOIN sp_program pg \
                        ON mp.match_id = pg.fix_id \
                        LEFT JOIN sp_team ht \
                        ON pg.hometeam_id = ht.team_id \
                        LEFT JOIN sp_team at \
                        ON pg.awayteam_id = at.team_id \
                        WHERE mp.player_id = ' + item.player_id + '\
                        AND mp.tournament_id = ' + tournamentId + ' \
                        AND ' + dataFlag + ' <> 0 \
                        ORDER BY pg.kickoff DESC';

                                        //playerInfo[key].fullname = query;

                                        mysqlModule.getDataLivescore(query, function(error, result) { // data from each match
                                            if (error) return cb(error);

                                            if (utils.isEmptyObject(result)) {
                                                response_code = 404;
                                                error = new Error('match goal not found');
                                                cb(error);
                                            } else {
                                                playerInfo[key].goal_detail = result
                                                cb();
                                            }

                                        });


                                    }, function(err) {
                                        if (err) {
                                            return callback(err);
                                        } else {
                                            data = playerInfo;
                                            callback();
                                        }
                                    });
                                }

                            });

                        },
                        function(callback) {
                            data = sortObject(data);
                            callback();
                        },
                        function(callback) {
                            redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                                if (error) return callback(error);
                                callback();
                            }, 86400);
                        }
                    ], function(error) {
                        if (error) {
                            return utils.printJSON(res, utils.getJSONObject(response_code, error.message, null));
                        } else {
                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "redis", "cache_key": cacheKey }, data));
                        }
                    });

                }

            }

        });
    }

}

livescoreModule.getProgram = function(req, res, next) {
    var tournamentId = req.params.leagueid;
    var clearCache = req.query.clearCache;
    var programDate = req.query.date;
    var kickoffDayCacheKey = '';


    var data = {};
    var previousMatch = [];
    var nextMatch = [];

    if (clearCache === '' || typeof clearCache === 'undefined') {
        clearCache = false;
    }

    if (programDate === '' || typeof programDate === 'undefined') {
        programDate = 'NOW()';

    } else {
        kickoffDayCacheKey = '-' + programDate;
        programDate = '"' + programDate + '"';

    }

    if (isNaN(tournamentId)) {
        return utils.printJSON(res, utils.getJSONObject(400, { 'status': 'wrong parameter' }, null));

    } else {
        var cacheKey = cacheKeyPrefix + 'category-livescore-programs-' + tournamentId + kickoffDayCacheKey;
    }

    if (clearCache) {

        redisCaching.deleteCache(res, cacheKey, function(error, reply) {
            if (error) {
                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
            } else {
                if (reply) {
                    return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cache deleted", "cache_key": cacheKey }, null));
                } else {
                    return utils.printJSON(res, utils.getJSONObject(200, { 'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.' }, null));
                }
            }

        });

    } else {
        redisCaching.cacheExist(res, cacheKey, function(error, reply) {

            if (error) {

                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

                if (reply) {

                    redisCaching.getCache(res, cacheKey, function(error, result) {

                        if (error) {

                            return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

                        } else {

                            var json = JSON.parse(result);
                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cached redis", "cache_key": cacheKey }, json));
                        }

                    });

                } else {

                    async.series([

                        function(callback) { // get previous match date
                            var query = 'SELECT * FROM ( \
                            SELECT DISTINCT DATE(kickoff) as kickoff \
                            FROM sp_program \
                            WHERE league_id = ' + tournamentId + ' \
                            AND DATE(kickoff) BETWEEN DATE(DATE_SUB(' + programDate + ', INTERVAL 90 DAY))  \
                            AND DATE(DATE_SUB(' + programDate + ', INTERVAL 1 DAY)) \
                            ORDER BY kickoff DESC LIMIT 2 \
                          ) AS kickoff ORDER BY kickoff';

                            mysqlModule.getDataLivescore(query, function(error, result) {
                                if (error) return callback(error);

                                for (var i in result) {
                                    previousMatch.push(dateFormat(result[i].kickoff, "yyyy-mm-dd"));
                                }

                                callback();
                            });
                        },
                        function(callback) { // Get next match date
                            var query = 'SELECT DISTINCT DATE(kickoff) as kickoff \
                            FROM sp_program \
                            WHERE league_id = ' + tournamentId + ' \
                            AND DATE(kickoff) BETWEEN DATE(' + programDate + ') \
                            AND DATE(DATE_ADD(' + programDate + ', INTERVAL 90 DAY))  \
                            ORDER by kickoff \
                            LIMIT 3';

                            mysqlModule.getDataLivescore(query, function(error, result) {
                                if (error) return callback(error);
                                for (var i in result) {
                                    nextMatch.push(dateFormat(result[i].kickoff, "yyyy-mm-dd"));
                                }

                                callback();
                            });
                        },
                        function(callback) { // Get previous match compettition

                            async.each(previousMatch, function(item, cb) {
                                var key = item;

                                var query = 'SELECT p.program_id as match_id, p.league_id as tournament_id, \
                p.hometeam_id, p.hometeam_title, ht.team_name_en as hometeam_title_en, p.hometeam_point as hometeam_score, \
                p.awayteam_id, p.awayteam_title, at.team_name_en as awayteam_title_en, p.awayteam_point as awayteam_score, p.kickoff, \
                p.status as match_status, \
                p.channel1, p.channel2, \
                sp_channel1.channel_icon as channel1_icon, sp_channel1.channel_name as channel1_name, \
                sp_channel2.channel_icon as channel2_icon, sp_channel2.channel_name as channel2_name \
                FROM sp_program p\
                LEFT JOIN sp_channel as sp_channel1 \
                ON p.channel1 = sp_channel1.channel_id \
                LEFT JOIN sp_channel as sp_channel2 \
                ON p.channel2 = sp_channel2.channel_id \
                LEFT JOIN sp_team ht \
                ON p.hometeam_id = ht.team_id \
                LEFT JOIN sp_team at \
                ON p.awayteam_id = at.team_id \
                WHERE p.league_id = ' + tournamentId + ' \
                AND DATE(kickoff) = "' + item + '" \
                AND p.status <> 0';

                                mysqlModule.getDataLivescore(query, function(error, result) {
                                    if (error) return cb(error);
                                    data[key] = result;
                                    cb();
                                });


                            }, function(err) {
                                if (err) {
                                    return callback(err);
                                } else {

                                    callback();
                                }
                            });
                        },
                        function(callback) { // Get Next match compettition

                            async.each(nextMatch, function(item, cb) {
                                var key = item;

                                var query = 'SELECT p.program_id as match_id, p.league_id as tournament_id, \
                p.hometeam_id, p.hometeam_title, ht.team_name_en as hometeam_title_en, p.hometeam_point as hometeam_score, \
                p.awayteam_id, p.awayteam_title, at.team_name_en as awayteam_title_en, p.awayteam_point as awayteam_score, p.kickoff, \
                p.status as match_status, \
                p.channel1, p.channel2, \
                sp_channel1.channel_icon as channel1_icon, sp_channel1.channel_name as channel1_name, \
                sp_channel2.channel_icon as channel2_icon, sp_channel2.channel_name as channel2_name \
                FROM sp_program p\
                LEFT JOIN sp_channel as sp_channel1 \
                ON p.channel1 = sp_channel1.channel_id \
                LEFT JOIN sp_channel as sp_channel2 \
                ON p.channel2 = sp_channel2.channel_id \
                LEFT JOIN sp_team ht \
                ON p.hometeam_id = ht.team_id \
                LEFT JOIN sp_team at \
                ON p.awayteam_id = at.team_id \
                WHERE p.league_id = ' + tournamentId + ' \
                AND DATE(kickoff) = "' + item + '" \
                AND p.status <> 0';

                                mysqlModule.getDataLivescore(query, function(error, result) {
                                    if (error) return cb(error);
                                    data[key] = result;
                                    cb();
                                });


                            }, function(err) {
                                if (err) {
                                    return callback(err);
                                } else {
                                    callback();
                                }
                            });

                        },
                        function(callback) {
                            data = sortObject(data);
                            callback();
                        },
                        function(callback) {
                            redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                                if (error) return callback(error);
                                callback();
                            }, 86400);
                        }
                    ], function(error) {
                        if (error) {
                            return utils.printJSON(res, utils.getJSONObject(500, error.message, null));
                        } else {

                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "redis", "cache_key": cacheKey }, data));
                        }
                    })

                }

            }

        });
    }


};

livescoreModule.getMonthlyPrograms = function(req, res, next) {
    var tournamentId = req.params.tournamentId;
    var paramYear = req.params.year;
    var paramMonth = req.params.month;
    var clearCache = req.query.clearCache;
    var errorCode = 500;
    var kickoffDay = [];
    var data = {};


    if (isNaN(tournamentId) || isNaN(paramYear) || isNaN(paramMonth)) {
        errorCode = 400;
        return utils.printJSON(res, utils.getJSONObject(errorCode, { 'message': 'wrong parameter' }, null));
    }

    if (clearCache === '' || typeof clearCache === 'undefined') {
        clearCache = false;
    }

    var cacheKey = cacheKeyPrefix + 'category-livescore-monthlyPrograms-' + tournamentId + '-' + paramYear + '-' + paramMonth;

    if (clearCache) {

        redisCaching.deleteCache(res, cacheKey, function(error, reply) {
            if (error) {
                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
            } else {
                if (reply) {
                    return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cache deleted", "cache_key": cacheKey }, null));
                } else {
                    return utils.printJSON(res, utils.getJSONObject(200, { 'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.' }, null));
                }
            }

        });

    } else {
        redisCaching.cacheExist(res, cacheKey, function(error, reply) {

            if (error) {

                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

                if (reply) {

                    redisCaching.getCache(res, cacheKey, function(error, result) {

                        if (error) {

                            return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

                        } else {

                            var json = JSON.parse(result);
                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cached redis", "cache_key": cacheKey }, json));
                        }

                    });

                } else {

                    var query = 'SELECT DISTINCT(DATE(kickoff)) as kickoffDay \
          FROM sp_program \
          WHERE league_id = ' + tournamentId + ' \
          AND YEAR(kickoff) = ' + paramYear + ' \
          AND MONTH(kickoff) = ' + paramMonth + '\
          ORDER BY kickoffDay';

                    mysqlModule.getDataLivescore(query, function(error, result) {
                        if (error) {
                            return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));
                        } else {
                            if (utils.isEmptyObject(result)) {
                                errorCode = 404;
                                error = new Error('Data not found');
                                return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));
                            } else {
                                for (var i in result) {
                                    kickoffDay.push(dateFormat(result[i].kickoffDay, "yyyy-mm-dd"));
                                }
                                data.kickoff = kickoffDay;

                                redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                                    if (error) {
                                        return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "no cache - " + error.message, "cache_key": cacheKey }, data));
                                    } else {
                                        return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "redis", "cache_key": cacheKey }, data));
                                    }
                                }, 86400);

                            }
                        }

                    });

                }

            }

        });
    }

};

livescoreModule.getYearPrograms = function(req, res, next) {
    var tournamentId = req.params.tournamentId;
    var paramYear = req.params.year;
    var clearCache = req.query.clearCache;
    var errorCode = 500;
    var kickoffDay = [];
    var data = {};


    if (isNaN(tournamentId) || isNaN(paramYear)) {
        errorCode = 400;
        return utils.printJSON(res, utils.getJSONObject(errorCode, { 'message': 'wrong parameter' }, null));
    }

    if (clearCache === '' || typeof clearCache === 'undefined') {
        clearCache = false;
    }

    var cacheKey = cacheKeyPrefix + 'category-livescore-yearPrograms-' + tournamentId + '-' + paramYear;

    if (clearCache) {

        redisCaching.deleteCache(res, cacheKey, function(error, reply) {
            if (error) {
                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
            } else {
                if (reply) {
                    return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cache deleted", "cache_key": cacheKey }, null));
                } else {
                    return utils.printJSON(res, utils.getJSONObject(200, { 'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.' }, null));
                }
            }

        });

    } else {
        redisCaching.cacheExist(res, cacheKey, function(error, reply) {

            if (error) {

                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

                if (reply) {

                    redisCaching.getCache(res, cacheKey, function(error, result) {

                        if (error) {

                            return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

                        } else {

                            var json = JSON.parse(result);
                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cached redis", "cache_key": cacheKey }, json));
                        }

                    });

                } else {

                    var query = 'SELECT DISTINCT(DATE(kickoff)) as kickoffDay \
          FROM sp_program \
          WHERE league_id = ' + tournamentId + ' \
          AND YEAR(kickoff) = ' + paramYear + ' \
          AND MONTH(kickoff) BETWEEN 1 AND 12 \
          ORDER BY kickoffDay';

                    mysqlModule.getDataLivescore(query, function(error, result) {
                        if (error) {
                            return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));
                        } else {
                            if (utils.isEmptyObject(result)) {
                                errorCode = 404;
                                error = new Error('Data not found');
                                return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));
                            } else {
                                for (var i in result) {
                                    kickoffDay.push(dateFormat(result[i].kickoffDay, "yyyy-mm-dd"));
                                }
                                data.kickoff = kickoffDay;

                                redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                                    if (error) {
                                        return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "no cache - " + error.message, "cache_key": cacheKey }, data));
                                    } else {
                                        return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "redis", "cache_key": cacheKey }, data));
                                    }
                                }, 86400);

                            }
                        }

                    });

                }

            }

        });
    }

};

livescoreModule.getProgramByTeam = function(req, res, next) {
    var teamId = req.params.teamid;
    var clearCache = req.query.clearCache;
    var programDate = req.query.date;
    var kickoffDayCacheKey = '';


    var data = {};
    var previousMatch = [];
    var nextMatch = [];

    if (clearCache === '' || typeof clearCache === 'undefined') {
        clearCache = false;
    }

    if (programDate === '' || typeof programDate === 'undefined') {
        programDate = 'NOW()';

    } else {
        kickoffDayCacheKey = '-' + programDate;
        programDate = '"' + programDate + '"';

    }

    if (isNaN(teamId)) {
        return utils.printJSON(res, utils.getJSONObject(400, { 'status': 'wrong parameter' }, null));

    } else {
        var cacheKey = cacheKeyPrefix + 'category-livescore-programs-byteam-' + teamId + kickoffDayCacheKey;
    }

    if (clearCache) {

        redisCaching.deleteCache(res, cacheKey, function(error, reply) {
            if (error) {
                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
            } else {
                if (reply) {
                    return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cache deleted", "cache_key": cacheKey }, null));
                } else {
                    return utils.printJSON(res, utils.getJSONObject(200, { 'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.' }, null));
                }
            }

        });

    } else {
        redisCaching.cacheExist(res, cacheKey, function(error, reply) {

            if (error) {

                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

                if (reply) {

                    redisCaching.getCache(res, cacheKey, function(error, result) {

                        if (error) {

                            return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

                        } else {

                            var json = JSON.parse(result);
                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cached redis", "cache_key": cacheKey }, json));
                        }

                    });

                } else {

                    async.series([

                        function(callback) { // get previous match date
                            var query = 'SELECT * FROM ( \
              SELECT DISTINCT DATE(kickoff) as kickoff \
              FROM sp_program \
              WHERE (hometeam_id = ' + teamId + ' OR awayteam_id = ' + teamId + ') \
              AND DATE(kickoff) BETWEEN DATE(DATE_SUB(' + programDate + ', INTERVAL 30 DAY))  \
              AND DATE(DATE_SUB(' + programDate + ', INTERVAL 1 DAY)) \
              ORDER BY kickoff DESC LIMIT 2 \
            ) AS kickoff ORDER BY kickoff';

                            mysqlModule.getDataLivescore(query, function(error, result) {
                                if (error) return callback(error);

                                for (var i in result) {
                                    previousMatch.push(dateFormat(result[i].kickoff, "yyyy-mm-dd"));
                                }

                                callback();
                            });
                        },
                        function(callback) { // Get next match date
                            var query = 'SELECT DISTINCT DATE(kickoff) as kickoff \
              FROM sp_program \
              WHERE (hometeam_id = ' + teamId + ' OR awayteam_id = ' + teamId + ') \
              AND DATE(kickoff) BETWEEN DATE(' + programDate + ') \
              AND DATE(DATE_ADD(' + programDate + ', INTERVAL 30 DAY))  \
              ORDER by kickoff \
              LIMIT 3';

                            mysqlModule.getDataLivescore(query, function(error, result) {
                                if (error) return callback(error);
                                for (var i in result) {
                                    nextMatch.push(dateFormat(result[i].kickoff, "yyyy-mm-dd"));
                                }

                                callback();
                            });
                        },
                        function(callback) { // Get previous match compettition

                            async.each(previousMatch, function(item, cb) {
                                var key = item;

                                var query = 'SELECT p.program_id as match_id, p.league_id as tournament_id, \
                p.hometeam_id, p.hometeam_title, ht.team_name_en as hometeam_title_en, p.hometeam_point as hometeam_score, \
                p.awayteam_id, p.awayteam_title, at.team_name_en as awayteam_title_en, p.awayteam_point as awayteam_score, p.kickoff, \
                p.status as match_status, \
                p.channel1, p.channel2, \
                sp_channel1.channel_icon as channel1_icon, sp_channel1.channel_name as channel1_name, \
                sp_channel2.channel_icon as channel2_icon, sp_channel2.channel_name as channel2_name \
                FROM sp_program p\
                LEFT JOIN sp_channel as sp_channel1 \
                ON p.channel1 = sp_channel1.channel_id \
                LEFT JOIN sp_channel as sp_channel2 \
                ON p.channel2 = sp_channel2.channel_id \
                LEFT JOIN sp_team ht \
                ON p.hometeam_id = ht.team_id \
                LEFT JOIN sp_team at \
                ON p.awayteam_id = at.team_id \
                WHERE (p.hometeam_id = ' + teamId + ' OR p.awayteam_id = ' + teamId + ') \
                AND DATE(kickoff) = "' + item + '" \
                AND p.status <> 0';

                                mysqlModule.getDataLivescore(query, function(error, result) {
                                    if (error) return cb(error);
                                    data[key] = result;
                                    cb();
                                });


                            }, function(err) {
                                if (err) {
                                    return callback(err);
                                } else {

                                    callback();
                                }
                            });
                        },
                        function(callback) { // Get Next match compettition

                            async.each(nextMatch, function(item, cb) {
                                var key = item;

                                var query = 'SELECT p.program_id as match_id, p.league_id as tournament_id, \
                p.hometeam_id, p.hometeam_title, ht.team_name_en as hometeam_title_en, p.hometeam_point as hometeam_score, \
                p.awayteam_id, p.awayteam_title, at.team_name_en as awayteam_title_en, p.awayteam_point as awayteam_score, p.kickoff, \
                p.status as match_status, \
                p.channel1, p.channel2, \
                sp_channel1.channel_icon as channel1_icon, sp_channel1.channel_name as channel1_name, \
                sp_channel2.channel_icon as channel2_icon, sp_channel2.channel_name as channel2_name \
                FROM sp_program p\
                LEFT JOIN sp_channel as sp_channel1 \
                ON p.channel1 = sp_channel1.channel_id \
                LEFT JOIN sp_channel as sp_channel2 \
                ON p.channel2 = sp_channel2.channel_id \
                LEFT JOIN sp_team ht \
                ON p.hometeam_id = ht.team_id \
                LEFT JOIN sp_team at \
                ON p.awayteam_id = at.team_id \
                WHERE (p.hometeam_id = ' + teamId + ' OR p.awayteam_id = ' + teamId + ') \
                AND DATE(kickoff) = "' + item + '" \
                AND p.status <> 0';

                                mysqlModule.getDataLivescore(query, function(error, result) {
                                    if (error) return cb(error);
                                    data[key] = result;
                                    cb();
                                });


                            }, function(err) {
                                if (err) {
                                    return callback(err);
                                } else {
                                    callback();
                                }
                            });

                        },
                        function(callback) {
                            data = sortObject(data);
                            callback();
                        },
                        function(callback) {
                            redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                                if (error) return callback(error);
                                callback();
                            }, 86400);
                        }
                    ], function(error) {
                        if (error) {
                            return utils.printJSON(res, utils.getJSONObject(500, error.message, null));
                        } else {

                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "redis", "cache_key": cacheKey }, data));
                        }
                    })

                }

            }

        });
    }


};

livescoreModule.getMonthlyProgramsByTeam = function(req, res, next) {
    var teamId = req.params.teamId;
    var paramYear = req.params.year;
    var paramMonth = req.params.month;
    var clearCache = req.query.clearCache;
    var errorCode = 500;
    var kickoffDay = [];
    var data = {};


    if (isNaN(teamId) || isNaN(paramYear) || isNaN(paramMonth)) {
        errorCode = 400;
        return utils.printJSON(res, utils.getJSONObject(errorCode, { 'message': 'wrong parameter' }, null));
    }

    if (clearCache === '' || typeof clearCache === 'undefined') {
        clearCache = false;
    }

    var cacheKey = cacheKeyPrefix + 'category-livescore-monthlyPrograms-byteam-' + teamId + '-' + paramYear + '-' + paramMonth;

    if (clearCache) {

        redisCaching.deleteCache(res, cacheKey, function(error, reply) {
            if (error) {
                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
            } else {
                if (reply) {
                    return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cache deleted", "cache_key": cacheKey }, null));
                } else {
                    return utils.printJSON(res, utils.getJSONObject(200, { 'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.' }, null));
                }
            }

        });

    } else {
        redisCaching.cacheExist(res, cacheKey, function(error, reply) {

            if (error) {

                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

                if (reply) {

                    redisCaching.getCache(res, cacheKey, function(error, result) {

                        if (error) {

                            return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

                        } else {

                            var json = JSON.parse(result);
                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cached redis", "cache_key": cacheKey }, json));
                        }

                    });

                } else {

                    var query = 'SELECT DISTINCT(DATE(kickoff)) as kickoffDay \
          FROM sp_program \
          WHERE (hometeam_id = ' + teamId + ' OR awayteam_id = ' + teamId + ') \
          AND YEAR(kickoff) = ' + paramYear + ' \
          AND MONTH(kickoff) = ' + paramMonth + '\
          ORDER BY kickoffDay';

                    mysqlModule.getDataLivescore(query, function(error, result) {
                        if (error) {
                            return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));
                        } else {
                            if (utils.isEmptyObject(result)) {
                                errorCode = 404;
                                error = new Error('Data not found');
                                return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));
                            } else {
                                for (var i in result) {
                                    kickoffDay.push(dateFormat(result[i].kickoffDay, "yyyy-mm-dd"));
                                }
                                data.kickoff = kickoffDay;

                                redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                                    if (error) {
                                        return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "no cache - " + error.message, "cache_key": cacheKey }, data));
                                    } else {
                                        return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "redis", "cache_key": cacheKey }, data));
                                    }
                                }, 86400);

                            }
                        }

                    });

                }

            }

        });
    }

};

livescoreModule.getYearProgramsByTeam = function(req, res, next) {
    var teamId = req.params.teamId;
    var paramYear = req.params.year;
    var clearCache = req.query.clearCache;
    var errorCode = 500;
    var kickoffDay = [];
    var data = {};


    if (isNaN(teamId) || isNaN(paramYear)) {
        errorCode = 400;
        return utils.printJSON(res, utils.getJSONObject(errorCode, { 'message': 'wrong parameter' }, null));
    }

    if (clearCache === '' || typeof clearCache === 'undefined') {
        clearCache = false;
    }

    var cacheKey = cacheKeyPrefix + 'category-livescore-yearPrograms-byteam-' + teamId + '-' + paramYear;

    if (clearCache) {

        redisCaching.deleteCache(res, cacheKey, function(error, reply) {
            if (error) {
                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
            } else {
                if (reply) {
                    return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cache deleted", "cache_key": cacheKey }, null));
                } else {
                    return utils.printJSON(res, utils.getJSONObject(200, { 'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.' }, null));
                }
            }

        });

    } else {
        redisCaching.cacheExist(res, cacheKey, function(error, reply) {

            if (error) {

                return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

                if (reply) {

                    redisCaching.getCache(res, cacheKey, function(error, result) {

                        if (error) {

                            return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

                        } else {

                            var json = JSON.parse(result);
                            return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "cached redis", "cache_key": cacheKey }, json));
                        }

                    });

                } else {

                    var query = 'SELECT DISTINCT(DATE(kickoff)) as kickoffDay \
          FROM sp_program \
          WHERE (hometeam_id = ' + teamId + ' OR awayteam_id = ' + teamId + ') \
          AND YEAR(kickoff) = ' + paramYear + ' \
          AND MONTH(kickoff) BETWEEN 1 AND 12 \
          ORDER BY kickoffDay';

                    mysqlModule.getDataLivescore(query, function(error, result) {
                        if (error) {
                            return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));
                        } else {
                            if (utils.isEmptyObject(result)) {
                                errorCode = 404;
                                error = new Error('Data not found');
                                return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));
                            } else {
                                for (var i in result) {
                                    kickoffDay.push(dateFormat(result[i].kickoffDay, "yyyy-mm-dd"));
                                }
                                data.kickoff = kickoffDay;

                                redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                                    if (error) {
                                        return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "no cache - " + error.message, "cache_key": cacheKey }, data));
                                    } else {
                                        return utils.printJSON(res, utils.getJSONObject(200, { "status": "success", "cache": "redis", "cache_key": cacheKey }, data));
                                    }
                                }, 86400);

                            }
                        }

                    });

                }

            }

        });
    }

};

module.exports = livescoreModule;
