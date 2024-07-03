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

var matchModule = matchModule.prototype;

function matchModule() {

}

matchModule.getBoxingYearPrograms = function(req, res, next) {
  var paramYear = req.params.year;
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var matchDay = [];
  var data = {};


  if(isNaN(paramYear) ) {
    errorCode = 400;
    return utils.printJSON(res, utils.getJSONObject(errorCode, {'message': 'wrong parameter'}, null));
  }

  if( clearCache === '' || typeof clearCache === 'undefined' ) {
    clearCache = false;
  }

  var cacheKey = cacheKeyPrefix + 'category-match-yearPrograms-' + 'boxing-' + paramYear;

  if (clearCache) {

    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if(error) {
          return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
      } else {
          if (reply) {
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cache deleted", "cache_key":cacheKey}, null));
          } else {
              return utils.printJSON(res, utils.getJSONObject(200, {'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.'}, null));
          }
      }

    });

  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {

      if (error) {

        return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

      } else {

        if(reply) {

          redisCaching.getCache(res, cacheKey, function(error, result) {

            if (error) {

              return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

              var json = JSON.parse(result);
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cached redis", "cache_key": cacheKey}, json));
            }

          });

        } else {

          var query = 'SELECT DISTINCT(DATE(match_date)) as fightDay \
          FROM ss_match \
          WHERE sport_id = 7 \
          AND YEAR(match_date) = ' + paramYear + ' \
          AND MONTH(match_date) BETWEEN 1 AND 12 \
          ORDER BY fightDay';

          mysqlModule.getData(query, function(error, result) {
              if(error) {

                return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));

              } else {

                if (utils.isEmptyObject(result)) {

                  errorCode = 404;
                  error = new Error('Data not found');
                  return utils.printJSON(res, utils.getJSONObject(errorCode, error.message, null));

                } else {

                  for (var i in result) {

                    matchDay.push(dateFormat(result[i].fightDay, "yyyy-mm-dd"));

                  }
                  data.matchDay = matchDay;

                  redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                    if(error) {
                      return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "no cache - " + error.message, "cache_key": cacheKey }, data));
                    } else {
                      return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "redis", "cache_key": cacheKey}, data));
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

matchModule.getBoxingProgram = function(req, res, next) {

  var clearCache = req.query.clearCache;
  var programDate = req.query.date;
  var analyse = req.query.analyse;
  var fightDayCacheKey = '';
  var analyseCache = '';


  var data = {};
  var previousMatch = [];
  var nextMatch = [];
  var queryOnlyAnalyse = '';

  if( clearCache === '' || typeof clearCache === 'undefined' ) {
    clearCache = false;
  }

  if( programDate === '' || typeof programDate === 'undefined' ) {
    programDate = 'NOW()';

  } else {
    fightDayCacheKey = '-' + programDate;
    programDate = '"' + programDate + '"';

  }

  if (analyse == 1) {
    analyseCache = '-analyse';
  }

  var cacheKey = cacheKeyPrefix + 'category-match-programs-' + 'boxing' + fightDayCacheKey + analyseCache;


  if (clearCache) {

    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if(error) {
          return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
      } else {
          if (reply) {
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cache deleted", "cache_key":cacheKey}, null));
          } else {
              return utils.printJSON(res, utils.getJSONObject(200, {'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.'}, null));
          }
      }

    });

  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {

      if (error) {

        return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

      } else {

        if(reply) {

          redisCaching.getCache(res, cacheKey, function(error, result) {

            if (error) {

              return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

              var json = JSON.parse(result);
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cached redis", "cache_key": cacheKey}, json));
            }

          });

        } else {

          async.series([

            function(callback) { // get previous match date
              var query = 'SELECT * FROM ( \
              SELECT DISTINCT DATE(match_date) as fightday \
              FROM ss_match \
              WHERE sport_id = 7  \
              AND DATE(match_date) BETWEEN DATE(DATE_SUB(' + programDate + ', INTERVAL 90 DAY))  \
              AND DATE(DATE_SUB(' + programDate + ', INTERVAL 1 DAY)) \
              ORDER BY fightday DESC LIMIT 2 \
            ) AS fightday ORDER BY fightday';

              mysqlModule.getData(query, function(error, result) {
                  if(error) {
                    callback(error)
                  } else {
                    for (var i in result) {
                      previousMatch.push( dateFormat(result[i].fightday, "yyyy-mm-dd") );
                    }
                    callback();
                  }
              });
            },
            function(callback) { // Get next match date
              var query = 'SELECT DISTINCT DATE(match_date) as fightday \
              FROM ss_match \
              WHERE sport_id = 7  \
              AND DATE(match_date) BETWEEN DATE(' + programDate + ') \
              AND DATE(DATE_ADD(' + programDate + ', INTERVAL 90 DAY))  \
              ORDER by fightday \
              LIMIT 3';

              mysqlModule.getData(query, function(error, result) {
                  if(error) {
                    callback(error);
                  } else {
                    for (var i in result) {
                      nextMatch.push( dateFormat(result[i].fightday, "yyyy-mm-dd") );
                    }
                    callback();
                  }

              });
            },
            function (callback) { // Get tournamament on previous match compettition

              async.each(previousMatch, function(item, cb) {
                var key = item;

                var query = 'SELECT DISTINCT(p.tournament_id), t.tournament_name_th \
                FROM ss_match p \
                LEFT JOIN ss_tournament t \
                ON p.tournament_id = t.tournament_id \
                WHERE p.sport_id = 7 \
                AND DATE(match_date) = "' + item + '" \
                AND p.status <> 0';

                mysqlModule.getData(query, function(error, result) {
                  if (error) {
                    cb(error);
                  } else {
                    data[key] = result;
                    cb();
                  }
                });

              }, function(err) {
                if(err) {
                  callback(err);
                } else {
                  callback();
                }
              });

            },
            function (callback) { // Get tournamament on Next match compettition

              async.each(nextMatch, function(item, cb) {
                var key = item;

                var query = 'SELECT DISTINCT(p.tournament_id), t.tournament_name_th \
                FROM ss_match p \
                LEFT JOIN ss_tournament t \
                ON p.tournament_id = t.tournament_id \
                WHERE p.sport_id = 7 \
                AND DATE(p.match_date) = "' + item + '" \
                AND p.status <> 0';

                mysqlModule.getData(query, function(error, result) {
                  if (error) {
                    cb(error);
                  } else {
                    data[key] = result;
                    cb();
                  }

                });


              }, function(err) {
                if(err) {
                  callback(err);
                } else {
                  callback();
                }
              });

            },
            function (callback) {
              async.forEachOf(data, function(item, key, cb) {

                var matchDate = key;

                async.each(item, function(i, cb2) {

                  if(analyse == 1) {
                    queryOnlyAnalyse = ' AND a.probability_games <> ""';
                  }

                  var tournamentId = i.tournament_id;
                  var query = 'SELECT p.match_id, p.tournament_id, p.sport_id, \
                  p.home_id, p.home_team, \
                  p.away_id, p.away_team,\
                  p.match_date, p.result, p.status as match_status,\
                  p.lives_tv, p.lastupdate_date, p.feature,\
                  a.match_predit_id, a.weight_team1, a.weight_team2, a.compare_team1, a.compare_team2, a.rate,\
                  a.stat3_team1, a.stat3_team2, a.probability_games, a.predictor \
                  FROM ss_match p \
                  LEFT JOIN ss_match_predictor a \
                  ON p.match_id = a.match_id \
                  WHERE p.sport_id = 7 \
                  ' + queryOnlyAnalyse + ' \
                  AND p.tournament_id = ' + tournamentId + ' \
                  AND DATE(p.match_date) = \'' + matchDate + '\' \
                  AND p.status <> 0';

                  mysqlModule.getData(query, function(error, result) {
                    if (error) {
                      cb2(error);
                    } else {
                      i['match'] = result;
                      cb2();
                    }
                  });

                }, function(err) {
                  if(err) {
                    cb(err);
                  } else {
                    cb();
                  }
                })

              }, function(err) {
                if(err) {
                  callback(err);
                } else {
                  callback();
                }
              })

            },

            function (callback) {
              data = sortObject(data);
              callback();
            },

            function(callback) {
              redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                if(error) {
                  callback(error);
                } else {
                  callback();
                }

              }, 86400);
            }


          ], function(error) {
            if(error) {
              return utils.printJSON(res, utils.getJSONObject(500, error.message, null));
            } else {

              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "redis", "cache_key": cacheKey}, data));
            }
          })

        }

      }

    });
  }

};


matchModule.getBoxingAnalysis = function(req, res, next) {
  var clearCache = req.query.clearCache;
  var programDate = req.query.date;
  var fightDayCacheKey = '';


  var data = {};
  var previousMatch = [];
  var nextMatch = [];

  if( clearCache === '' || typeof clearCache === 'undefined' ) {
    clearCache = false;
  }

  if( programDate === '' || typeof programDate === 'undefined' ) {
    fightDayCacheKey = 'today';
    programDate = 'NOW()';

  } else {
    fightDayCacheKey = '-' + programDate;
    programDate = '"' + programDate + '"';

  }

  var cacheKey = cacheKeyPrefix + 'category-match-analysis-boxing-' + fightDayCacheKey;


  if (clearCache) {

    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if(error) {
          return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
      } else {
          if (reply) {
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cache deleted", "cache_key":cacheKey}, null));
          } else {
              return utils.printJSON(res, utils.getJSONObject(200, {'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.'}, null));
          }
      }

    });

  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {

      if (error) {

        return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

      } else {

        if(reply) {

          redisCaching.getCache(res, cacheKey, function(error, result) {

            if (error) {

              return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

              var json = JSON.parse(result);
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cached redis", "cache_key": cacheKey}, json));
            }

          });

        } else {

          async.series([

            function(callback) { // get previous match date
              /*
              var query = 'SELECT * FROM ( \
              SELECT DISTINCT DATE(match_date) as fightday \
              FROM ss_match \
              WHERE sport_id = 7  \
              AND DATE(match_date) BETWEEN DATE(DATE_SUB(' + programDate + ', INTERVAL 90 DAY))  \
              AND DATE(DATE_SUB(' + programDate + ', INTERVAL 1 DAY)) \
              ORDER BY fightday DESC LIMIT 2 \
            ) AS fightday ORDER BY fightday';
              */
              var query ='SELECT * FROM ( SELECT DISTINCT DATE(p.match_date) as fightday \
              FROM ss_match_predictor a \
              LEFT JOIN ss_match p \
              ON a.match_id = p.match_id \
              WHERE p.sport_id = 7 \
              AND a.probability_games <> "" \
              AND DATE(p.match_date) BETWEEN DATE(DATE_SUB(' + programDate + ', INTERVAL 90 DAY)) \
              AND DATE(DATE_SUB(' + programDate + ', INTERVAL 1 DAY)) \
              ORDER BY fightday DESC LIMIT 2) AS fightday ORDER BY fightday'

              mysqlModule.getData(query, function(error, result) {
                  if(error) {
                    callback(error)
                  } else {
                    for (var i in result) {
                      previousMatch.push( dateFormat(result[i].fightday, "yyyy-mm-dd") );
                    }
                    callback();
                  }
              });
            },
            function(callback) { // Get next match date
              /*
              var query = 'SELECT DISTINCT DATE(match_date) as fightday \
              FROM ss_match \
              WHERE sport_id = 7  \
              AND DATE(match_date) BETWEEN DATE(' + programDate + ') \
              AND DATE(DATE_ADD(' + programDate + ', INTERVAL 90 DAY))  \
              ORDER by fightday \
              LIMIT 3';
              */
              var query = 'SELECT DISTINCT DATE(p.match_date) as fightday \
              FROM ss_match_predictor a \
              LEFT JOIN ss_match p \
              ON a.match_id = p.match_id \
              WHERE p.sport_id = 7 \
              AND a.probability_games <> "" \
              AND DATE(p.match_date) BETWEEN DATE(' + programDate + ') \
              AND DATE(DATE_ADD(NOW(), INTERVAL 90 DAY)) \
              ORDER by fightday \
              LIMIT 3'

              mysqlModule.getData(query, function(error, result) {
                  if(error) {
                    callback(error);
                  } else {
                    for (var i in result) {
                      nextMatch.push( dateFormat(result[i].fightday, "yyyy-mm-dd") );
                    }
                    callback();
                  }

              });
            },
            function (callback) { // Get previous match compettition

              async.each(previousMatch, function(item, cb) {
                var key = item;

                var query = 'SELECT p.match_id, p.tournament_id, p.sport_id, \
                p.home_id, p.home_team, \
                p.away_id, p.away_team,\
                p.match_date, p.result, p.status as match_status,\
                p.lives_tv, p.lastupdate_date, p.feature,\
                a.match_predit_id, a.weight_team1, a.weight_team2, a.compare_team1, a.compare_team2, a.rate,\
                a.stat3_team1, a.stat3_team2, a.probability_games, a.predictor \
                FROM ss_match p \
                LEFT JOIN ss_match_predictor a \
                ON p.match_id = a.match_id \
                WHERE p.sport_id = 7 \
                AND a.probability_games <> "" \
                AND DATE(p.match_date) = \'' + key + '\' \
                AND p.status <> 0';

                mysqlModule.getData(query, function(error, result) {
                  if (error) {
                    cb(error)
                  } else {
                    data[key] = result;
                    cb();
                  }
                });

              }, function(err) {
                if(err) {
                  return callback(err);
                } else {

                  callback();
                }
              });
            },
            function (callback) { // Get Next match compettition

              async.each(nextMatch, function(item, cb) {
                var key = item;

                var query = 'SELECT p.match_id, p.tournament_id, p.sport_id, \
                p.home_id, p.home_team, \
                p.away_id, p.away_team,\
                p.match_date, p.result, p.status as match_status,\
                p.lives_tv, p.lastupdate_date, p.feature,\
                a.match_predit_id, a.weight_team1, a.weight_team2, a.compare_team1, a.compare_team2, a.rate,\
                a.stat3_team1, a.stat3_team2, a.probability_games, a.predictor \
                FROM ss_match p \
                LEFT JOIN ss_match_predictor a \
                ON p.match_id = a.match_id \
                WHERE p.sport_id = 7 \
                AND a.probability_games <> "" \
                AND DATE(p.match_date) = \'' + key + '\' \
                AND p.status <> 0';

                mysqlModule.getData(query, function(error, result) {
                  if (error) {
                    cb(error)
                  } else {
                    data[key] = result;
                    cb();
                  }

                });

              }, function(err) {
                if(err) {
                  callback(err);
                } else {
                  callback();
                }
              });

            },
            function (callback) {
              data = sortObject(data);
              callback();
            },
            function(callback) {
              redisCaching.saveCache(res, cacheKey, data, function(error, response) {
                if(error) return callback(error);
                callback();
              }, 86400);
            }
          ], function(error) {
            if(error) {
              return utils.printJSON(res, utils.getJSONObject(500, error.message, null));
            } else {

              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "redis", "cache_key": cacheKey}, data));
            }
          })

        }

      }

    });
  }

};

matchModule.getBoxingMatchAnalysis = function(req, res, next) {
  var matchId = req.params.matchId;
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var data = {};
  var hasGuru = 0;


  if(isNaN(matchId) ) {
    errorCode = 400;
    return utils.printJSON(res, utils.getJSONObject(errorCode, {'message': 'wrong parameter'}, null));
  }

  if( clearCache === '' || typeof clearCache === 'undefined' ) {
    clearCache = false;
  }

  var cacheKey = cacheKeyPrefix + 'category-match-analysis-' + 'boxing-' + matchId;

  if (clearCache) {

    redisCaching.deleteCache(res, cacheKey, function(error, reply) {
      if(error) {
          return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));
      } else {
          if (reply) {
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cache deleted", "cache_key":cacheKey}, null));
          } else {
              return utils.printJSON(res, utils.getJSONObject(200, {'status': 'fail', 'description': 'KEY ' + cacheKey + ' does not exist or already deleted.'}, null));
          }
      }

    });

  } else {
    redisCaching.cacheExist(res, cacheKey, function(error, reply) {

      if (error) {

        return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

      } else {

        if(reply) {

          redisCaching.getCache(res, cacheKey, function(error, result) {

            if (error) {

              return utils.printJSON(res, utils.getJSONObject(500, error.stack, null));

            } else {

              var json = JSON.parse(result);
              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache":"cached redis", "cache_key": cacheKey}, json));
            }

          });

        } else {

          async.series([

            function (callback) {
              /*var query = 'SELECT p.match_id, p.tournament_id, p.sport_id, \
              t.tournament_name_th, \
              p.home_id, p.home_team, \
              p.away_id, p.away_team,\
              p.match_date, p.result, p.status as match_status,\
              p.lives_tv, p.lastupdate_date, p.feature,\
              a.match_predit_id, a.weight_team1, a.weight_team2, a.compare_team1, a.compare_team2, a.rate,\
              a.stat3_team1, a.stat3_team2, a.probability_games, a.predictor \
              FROM ss_match p \
              LEFT JOIN ss_match_predictor a \
              ON p.match_id = a.match_id \
              LEFT JOIN ss_tournament t \
              ON p.tournament_id = t.tournament_id \
              WHERE p.sport_id = 7 \
              AND p.match_id = ' + matchId + ' \
              AND a.probability_games <> "" \
              AND p.status <> 0';*/

              var query = 'SELECT p.match_id, p.tournament_id, p.sport_id, \
              t.tournament_name_th, \
              p.home_id, p.home_team, \
              p.away_id, p.away_team,\
              p.match_date, p.result, p.status as match_status,\
              p.lives_tv, p.lastupdate_date, p.feature,\
              a.match_predit_id, a.weight_team1, a.weight_team2, a.compare_team1, a.compare_team2, a.rate,\
              a.stat3_team1, a.stat3_team2, a.probability_games, a.predictor \
              FROM ss_match p \
              LEFT JOIN ss_match_predictor a \
              ON p.match_id = a.match_id \
              LEFT JOIN ss_tournament t \
              ON p.tournament_id = t.tournament_id \
              WHERE p.sport_id = 7 \
              AND p.match_id = ' + matchId + ' \
              AND p.status <> 0';

              mysqlModule.getData(query, function(error, result) {
                  if(error) {
                    callback(error)
                  } else {
                    data = result;
                    callback();
                  }
              });

            }, function(callback) {
              var query = 'SELECT count(*) as guru \
              FROM `ss_match_guru_predictor` \
              WHERE match_id = ' + matchId;

              mysqlModule.getData(query, function(error, result) {
                  if(error) {
                    callback(error)
                  } else {
                    hasGuru = result;
                    callback();
                  }
              });

            }, function(callback) {
              if (!hasGuru) {
                data[0]['guru'] = '';
                callback();
              } else {
                var query = 'SELECT p.guru_comment, g.guru_name, p.order_by   \
                FROM ss_guru g \
                LEFT JOIN ss_match_guru_predictor p\
                ON g.guru_id = p.guru_id \
                WHERE p.match_id = ' + matchId + ' \
                AND p.status <> 0 \
                ORDER BY p.order_by';

                mysqlModule.getData(query, function(error, result) {
                    if(error) {
                      callback(error)
                    } else {
                      data[0]['guru'] = result;
                      callback();
                    }
                });

              }
            }

          ], function(error) {
            if(error) {
              return utils.printJSON(res, utils.getJSONObject(500, error.message, null));
            } else {

              return utils.printJSON(res, utils.getJSONObject(200, {"status": "success", "cache": "redis", "cache_key": cacheKey}, data));
            }
          })

        }

      }

    });
  }

};

module.exports = matchModule;
