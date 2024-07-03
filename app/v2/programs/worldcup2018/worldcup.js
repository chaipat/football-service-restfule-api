const moment = require("moment");
const base64 = require("base-64");
var sortObj = require("sort-object");

const config = require("../../../config/index");
const log = require("../../../../logging/index");
const helpers = require("../../../helper/helper");
const cached = require("../../caching/redis");
const MySqlClass = require("../../database/mysql.class");
const programs = require("../programs");

const TOURNAMENT = require("../../../config/tournament");
const FILEPATH = `${__dirname}/${__filename}`;

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;

const db = new MySqlClass(config.SS_MYSQL_CONNECTION_POOL);

async function getPrograms(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);

  var round = req.round;
  var results = {};

  // --- If cached, get data from caching
  var cachedData = await cached.get(cacheKey);

  // ถ้ามี cache อยู่ให้ return ข้อมูลที่เป็น cache เลย ถ้าไม่เจอก็ให้ไปดึงที่ database
  if (cachedData) {
    var data = JSON.parse(cachedData);
    results = {
      info: {
        dataSource: appMessage.dataSource.redis,
        cacheKey: cacheKey
      },
      data: data.content
    };

    return results;
  } else {
    var queryItems = `SELECT ss_match.match_id, ss_match.tournament_id, ss_match.sport_id, ss_match.round, ss_match.match_number,
                            ss_match.home_id, ss_match.home_team, ss_match.away_id, ss_match.away_team,
                            ss_team1.team_name_en as home_team_name_en,
                            ss_team1.team_name_th as home_team_name_th, ss_team1.team_logo as home_team_logo,
                            ss_team2.team_name_en as away_team_name_en,
                            ss_team2.team_name_th as away_team_name_th, ss_team2.team_logo as away_team_logo,
                            ss_match.ht_home_score, ss_match.ht_away_score, ss_match.ft_home_score, ss_match.ft_away_score, 
                            ss_match.et_home_score, ss_match.et_away_score, ss_match.pen_home_score, ss_match.pen_away_score,
                            ss_match.match_date, ss_match.match_status, ss_match.tournament, ss_match.lives_tv, ss_match.stadium_id,
                            ss_stadium.stadium_name_th, ss_stadium.stadium_name_en, ss_match.status, ss_match.create_date, ss_match.lastupdate_date,
                            ss_match_predictor.match_predit_id as analysis, ss_news.news_id2 as news_id
                            FROM ss_match
                            LEFT JOIN ss_team ss_team1 ON ss_match.home_id=ss_team1.team_id
                            LEFT JOIN ss_team ss_team2 ON ss_match.away_id=ss_team2.team_id
                            LEFT JOIN ss_stadium ON ss_match.stadium_id=ss_stadium.stadium_id
                            LEFT JOIN ss_match_predictor ON ss_match.match_id=ss_match_predictor.match_id
                            LEFT JOIN ss_news ON ss_match.match_id=ss_news.match_id
                            WHERE ss_match.st_id=28 
                            AND ss_match.round=${round}
                            ORDER BY ss_match.match_number`;

    var matches = await db.read(queryItems);

    if (helpers.isEmptyObject(matches)) {
      throw {
        code: 400,
        message: "data not found."
      };
    }

    var result = {};

    matches.map(row => {
      var cd = moment(row.match_date).locale("th");
      var thaiYear = cd.year() + 543;
      row.match_date_th = cd.format(`D MMMM ${thaiYear} HH:mm`);
      row.date_fromnow = cd.fromNow();
    });

    if (round == 1) {
      var matchDay1 = [],
        matchDay2 = [],
        matchDay3 = [];

      matches.map(match => {
        if (match.match_number <= 16) {
          matchDay1.push(match);
        } else if (match.match_number > 16 && match.match_number <= 32) {
          matchDay2.push(match);
        } else {
          matchDay3.push(match);
        }
      });

      result = {
        matchDay1,
        matchDay2,
        matchDay3
      };
    } else {
      result = matches;
    }

    results = {
      info: {
        dataSource: appMessage.dataSource.mysql,
        cacheKey: cacheKey,
        cacheTtl: config.cacheTtl.category
      },
      data: result
    };

    // --- save data to cache
    var data = {
      content: result
    };

    cached
      .set(cacheKey, config.cacheTtl.category, JSON.stringify(data))
      .then(result => {
        results.info.cached = "success";
      })
      .catch(error => {
        results.info.cached = "failed";
      });

    return results;
  }
}

async function getMatchDay(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);

  var results = {};

  // --- If cached, get data from caching
  var cachedData = await cached.get(cacheKey);

  // ถ้ามี cache อยู่ให้ return ข้อมูลที่เป็น cache เลย ถ้าไม่เจอก็ให้ไปดึงที่ database
  if (cachedData) {
    var data = JSON.parse(cachedData);
    results = {
      info: {
        dataSource: appMessage.dataSource.redis,
        cacheKey: cacheKey
      },
      data: data.content
    };

    return results;
  } else {
    var result = {};
    var matchesData = {};

    // ----- Get Matches-----
    try {
      if (req.query.selectDate) {
        var matches = await programs.getByDate(
          TOURNAMENT.worldcup2018.tournamentId,
          TOURNAMENT.worldcup2018.stId,
          req.query.selectDate
        );

        if (matches === null) {
          throw {
            code: 404,
            message: "data not found"
          };
        }

        result = matches;
      } else {
        var matchDay = await programs.getDayMatch(
          TOURNAMENT.worldcup2018.tournamentId,
          TOURNAMENT.worldcup2018.stId
        );

        await Promise.all(
          matchDay.map(async day => {
            var match = await programs.getByDate(
              TOURNAMENT.worldcup2018.tournamentId,
              TOURNAMENT.worldcup2018.stId,
              day.matchDate
            );
            matchesData[day.matchDate] = match;
          })
        )
          .then(completed => {
            result = sortObj(matchesData);
          })
          .catch(error => {
            throw {
              code: 500,
              message: error
            };
          });
      }
    } catch (error) {
      log.error(`${FILEPATH} - programs API error: ${error.message}`);
      throw error;
    }

    results = {
      info: {
        dataSource: appMessage.dataSource.mysql,
        cacheKey: cacheKey,
        cacheTtl: config.cacheTtl.category
      },
      data: result
    };

    // --- save data to cache
    var data = {
      content: result
    };

    cached
      .set(cacheKey, config.cacheTtl.category, JSON.stringify(data))
      .then(result => {
        results.info.cached = "success";
      })
      .catch(error => {
        results.info.cached = "failed";
      });

    return results;
  }
}

async function getByGroup(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);

  var results = {};

  // --- If cached, get data from caching
  var cachedData = await cached.get(cacheKey);

  // ถ้ามี cache อยู่ให้ return ข้อมูลที่เป็น cache เลย ถ้าไม่เจอก็ให้ไปดึงที่ database
  if (cachedData) {
    var data = JSON.parse(cachedData);
    results = {
      info: {
        dataSource: appMessage.dataSource.redis,
        cacheKey: cacheKey
      },
      data: data.content
    };

    return results;
  } else {
    var result = {};

    // ----- Get Matches-----
    try {
      var matches = await programs.getByGroup(
        TOURNAMENT.worldcup2018.tournamentId,
        TOURNAMENT.worldcup2018.stId,
        req.query.groupName
      );

      if (matches === null) {
        throw {
          code: 404,
          message: "data not found"
        };
      }

      result = matches;
    } catch (error) {
      log.error(`${FILEPATH} - programs API error: ${error.message}`);
      throw error;
    }

    results = {
      info: {
        dataSource: appMessage.dataSource.mysql,
        cacheKey: cacheKey,
        cacheTtl: config.cacheTtl.category
      },
      data: result
    };

    // --- save data to cache
    var data = {
      content: result
    };

    cached
      .set(cacheKey, config.cacheTtl.category, JSON.stringify(data))
      .then(result => {
        results.info.cached = "success";
      })
      .catch(error => {
        results.info.cached = "failed";
      });

    return results;
  }
}

async function getKnockOut(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);

  var results = {};

  // --- If cached, get data from caching
  var cachedData = await cached.get(cacheKey);

  // ถ้ามี cache อยู่ให้ return ข้อมูลที่เป็น cache เลย ถ้าไม่เจอก็ให้ไปดึงที่ database
  if (cachedData) {
    var data = JSON.parse(cachedData);
    results = {
      info: {
        dataSource: appMessage.dataSource.redis,
        cacheKey: cacheKey
      },
      data: data.content
    };

    return results;
  } else {
    var result = {};

    // ----- Get Matches-----
    try {
      var matches = await programs.getKnockOut(
        TOURNAMENT.worldcup2018.tournamentId,
        TOURNAMENT.worldcup2018.stId
      );

      if (matches === null) {
        throw {
          code: 404,
          message: "data not found"
        };
      }
      try {
        matches.map(match => {
          if (result[`${match.round}`]) {
            result[`${match.round}`].push(match);
          } else {
            result[`${match.round}`] = [];
            result[`${match.round}`].push(match);
          }
        });
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      log.error(`${FILEPATH} - programs API error: ${error.message}`);
      throw error;
    }

    results = {
      info: {
        dataSource: appMessage.dataSource.mysql,
        cacheKey: cacheKey,
        cacheTtl: config.cacheTtl.category
      },
      data: result
    };

    // --- save data to cache
    var data = {
      content: result
    };

    cached
      .set(cacheKey, config.cacheTtl.category, JSON.stringify(data))
      .then(result => {
        results.info.cached = "success";
      })
      .catch(error => {
        results.info.cached = "failed";
      });

    return results;
  }
}

var deleteCache = req => {
  return new Promise((resolve, reject) => {
    cached
      .deleteByPath(base64.encode(req.path))
      .then(result => {
        resolve(result);
      })
      .catch(error => {
        reject(error);
      });
  });
};

module.exports = {
  getPrograms,
  getByGroup,
  getMatchDay,
  getKnockOut,
  deleteCache
};
