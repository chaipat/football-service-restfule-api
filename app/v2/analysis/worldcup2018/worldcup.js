const base64 = require('base-64');

const config = require('../../../config/index');
const TOURNAMENT = require('../../../config/tournament');
const log = require('../../../../logging/index');
const helpers = require('../../../helper/helper');
const cached = require('../../caching/redis');

const programs = require('../../programs/programs');
const matchesAnalysis = require('../analysis');
const table = require('../../tables/table');
const match = require('../../matches/match');
const team = require('../../team/team');

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;
const FILEPATH = `${__dirname}/${__filename}`;

async function getItemList(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);

  var results = {};
  var result = {};

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
    try {
      var matches = await matchesAnalysis.getByTournament(
        TOURNAMENT.worldcup,
        28
      );
    } catch (error) {
      log.error(`${FILEPATH} - analysis API error: ${error}`);
    }

    if (helpers.isEmptyObject(matches)) {
      throw {
        code: 400,
        message: 'data not found.'
      };
    }

    helpers.addMomentDate(matches, 'match_date');

    result = matches;

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
        results.info.cached = 'success';
      })
      .catch(error => {
        results.info.cached = 'failed';
      });

    return results;
  }
}

async function getAnalysis(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);

  var matchId = req.matchId;
  var results = {};
  var result = {
    program: null,
    analysis: null,
    lineup: null,
    coach: {},
    formation: null,
    table: null
  };

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
    // ----- get match program -----
    try {
      var program = await programs.getByMatch(matchId, 28);
    } catch (error) {
      log.error(`${FILEPATH} - program API error: ${error}`);
    }

    if (helpers.isEmptyObject(program)) {
      throw {
        code: 400,
        message: 'match program not found.'
      };
    }

    result.program = program[0];

    // initial ID for use in other function
    var analysisId = result.program.analysis;
    var homeTeamId = result.program.home_id;
    var awayTeamId = result.program.away_id;

    if (analysisId === null) {
      throw {
        code: 400,
        message: 'no match analysis data.'
      };
    }

    // ----- get match analysis -----
    try {
      var matchAnalysis = await matchesAnalysis.getByMatch(analysisId);
    } catch (error) {
      log.error(`${FILEPATH} - analysis API error: ${error}`);
    }

    if (!helpers.isEmptyObject(matchAnalysis)) {
      result.analysis = matchAnalysis[0];
    }

    // get coach

    result.coach[homeTeamId] = null;
    result.coach[awayTeamId] = null;

    try {
      var coach1 = await team.getCoach(
        homeTeamId,
        TOURNAMENT.worldcup2018.tournamentId
      );

      if (coach1 !== null && coach1.length !== 0) {
        result.coach[homeTeamId] = coach1[0];
      }

      var coach2 = await team.getCoach(
        awayTeamId,
        TOURNAMENT.worldcup2018.tournamentId
      );

      if (coach2 !== null && coach2.length !== 0) {
        result.coach[awayTeamId] = coach2[0];
      }
    } catch (error) {
      log.error(`${FILEPATH} - match API error: ${error}`);
    }

    // ----- get formation -----
    try {
      var teamFormation = await match.getTeamFormation(matchId);

      if (teamFormation !== null && teamFormation.length !== 0) {
        result.formation = teamFormation[0];
      }
    } catch (error) {
      log.error(`${FILEPATH} - matches API error: ${error}`);
    }

    // ----- get match predict player -----
    try {
      var matchPredicPlayer = await match.getPredictLineup(
        matchId,
        homeTeamId,
        awayTeamId
      );
    } catch (error) {
      log.error(`${FILEPATH} - matches API error: ${error}`);
    }

    if (!helpers.isEmptyObject(matchPredicPlayer)) {
      result.lineup = matchPredicPlayer;
    }

    // ----- get group table -----
    try {
      var groupTable = await table.getGroupOfTeam(
        TOURNAMENT.worldcup,
        homeTeamId
      );
    } catch (error) {
      log.error(`${FILEPATH} - table API error: ${error}`);
    }

    if (!helpers.isEmptyObject(groupTable)) {
      result.table = groupTable;
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
        results.info.cached = 'success';
      })
      .catch(error => {
        results.info.cached = 'failed';
      });

    return results;
  }
}

async function getLive(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);

  var matchId = req.matchId;
  var results = {};
  var result = {
    program: null,
    report: null,
    info: null,
    stats: null
  };

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
    // ----- get match program -----
    try {
      var program = await match.getMatchInfo(matchId, 28);
    } catch (error) {
      log.error(`${FILEPATH} - program API error: ${error}`);
    }

    if (helpers.isEmptyObject(program)) {
      throw {
        code: 400,
        message: 'match program not found.'
      };
    }

    result.program = program[0];

    // initial ID for use in other function
    var homeTeamId = result.program.home_id;
    var awayTeamId = result.program.away_id;

    var matchInfo = {};
    matchInfo[homeTeamId] = {
      coach: [],
      lineup: [],
      subtitute: [],
      stats: null,
      penalty: null
    };
    matchInfo[awayTeamId] = {
      coach: [],
      lineup: [],
      subtitute: [],
      stats: null,
      penalty: null
    };

    // ----- get Live report -----
    try {
      var liveReport = await match.getLiveReport(matchId);

      if (liveReport !== null && liveReport.length !== 0) {
        result.report = liveReport;
      }
    } catch (error) {
      log.error(`${FILEPATH} - match API error: ${error}`);
    }

    // get coach
    try {
      var coach1 = await team.getCoach(
        homeTeamId,
        TOURNAMENT.worldcup2018.tournamentId
      );

      if (coach1 !== null && coach1.length !== 0) {
        matchInfo[homeTeamId].coach.push(coach1[0]);
      }

      var coach2 = await team.getCoach(
        awayTeamId,
        TOURNAMENT.worldcup2018.tournamentId
      );

      if (coach2 !== null && coach2.length !== 0) {
        matchInfo[awayTeamId].coach.push(coach2[0]);
      }
    } catch (error) {
      log.error(`${FILEPATH} - match API error: ${error}`);
    }

    // get player lineup
    try {
      var matchLineUp = await match.getLineUp(matchId, 0);

      if (matchLineUp !== null && matchLineUp.length !== 0) {
        matchLineUp.map(player => {
          if (player.team_id === homeTeamId) {
            matchInfo[homeTeamId].lineup.push(player);
          } else {
            matchInfo[awayTeamId].lineup.push(player);
          }
        });
      }
    } catch (error) {
      log.error(`${FILEPATH} - match API error: ${error}`);
    }

    // get subtitute player
    try {
      var subPlayer = await match.getLineUp(matchId, 1);
      if (subPlayer !== null && subPlayer.length !== 0) {
        subPlayer.map(player => {
          if (player.team_id === homeTeamId) {
            matchInfo[homeTeamId].subtitute.push(player);
          } else {
            matchInfo[awayTeamId].subtitute.push(player);
          }
        });
      }
    } catch (error) {
      log.error(`${FILEPATH} - match API error: ${error}`);
    }

    // ถ้า report เป็น null แสดงว่ายังไม่มี event เกิดขึ้น
    // ไม่ต้อง map event เข้ากับ user  เพราะจะทำให้ error
    if (result.report !== null) {
      // -- map event to player
      matchInfo[homeTeamId].lineup.map(player => {
        player.events = [];
        result.report.map(ev => {
          if (ev.p1_id === player.player_id) {
            player.events.push({
              event_id: ev.event_type_id,
              event: ev.event
            });
          }
        });
      });

      matchInfo[homeTeamId].subtitute.map(player => {
        player.events = [];
        result.report.map(ev => {
          if (ev.p1_id === player.player_id) {
            player.events.push({
              event_id: ev.event_type_id,
              event: ev.event
            });
          }
        });
      });

      matchInfo[awayTeamId].lineup.map(player => {
        player.events = [];
        result.report.map(ev => {
          if (ev.p2_id === player.player_id) {
            player.events.push({
              event_id: ev.event_type_id,
              event: ev.event
            });
          }
        });
      });

      matchInfo[awayTeamId].subtitute.map(player => {
        player.events = [];
        result.report.map(ev => {
          if (ev.p2_id === player.player_id) {
            player.events.push({
              event_id: ev.event_type_id,
              event: ev.event
            });
          }
        });
      });
    }

    // ----- get match stats -----
    try {
      var matchStat = await match.getMatchStats(matchId);

      if (matchStat !== null && matchStat.length !== 0) {
        matchStat.map(row => {
          if (row.team_id === homeTeamId) {
            matchInfo[homeTeamId].stats = row;
          } else {
            matchInfo[awayTeamId].stats = row;
          }
        });

        result.stats = matchStat;
      }
    } catch (error) {
      log.error(`${FILEPATH} - match API error: ${error}`);
    }

    // ----- get match penalty -----
    try {
      var homePenalty = await match.getPenalty(matchId, homeTeamId);

      if (homePenalty !== null && homePenalty.length !== 0) {
        matchInfo[homeTeamId].penalty = homePenalty;
      }
    } catch (error) {
      log.error(`${FILEPATH} - match API error: ${error}`);
    }

    try {
      var awayPenalty = await match.getPenalty(matchId, awayTeamId);

      if (awayPenalty !== null && awayPenalty.length !== 0) {
        matchInfo[awayTeamId].penalty = awayPenalty;
      }
    } catch (error) {
      log.error(`${FILEPATH} - match API error: ${error}`);
    }

    result.info = matchInfo;

    // ----- get group table -----

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
        results.info.cached = 'success';
      })
      .catch(error => {
        results.info.cached = 'failed';
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
  getItemList,
  getAnalysis,
  getLive,
  deleteCache
};
