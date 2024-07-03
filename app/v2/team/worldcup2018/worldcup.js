const base64 = require("base-64");

const config = require("../../../config/index");
const TOURNAMENT = require("../../../config/tournament");
const log = require("../../../../logging/index");
const helpers = require("../../../helper/helper");
const cached = require("../../caching/redis");

const news = require("../../news/news");
const column = require("../../column/column");
const table = require("../../tables/table");
const programs = require("../../programs/programs");
const team = require("../team");
const video = require("../../video/video");

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;
const FILEPATH = `${__dirname}/${__filename}`;

async function getList(req) {
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
    // ----- Get team List -----
    try {
      var teamList = await team.getByTournament(
        TOURNAMENT.worldcup2018.tournamentId
      );
    } catch (error) {
      log.error(`${FILEPATH} - team API error: ${error}`);
    }

    if (helpers.isEmptyObject(teamList)) {
      throw {
        code: 404,
        message: "Data not found."
      };
    }

    result = teamList;

    results = {
      info: {
        dataSource: appMessage.dataSource.mysql,
        cacheKey: cacheKey,
        cacheTtl: config.cacheTtl.aMonth
      },
      data: result
    };

    // --- save data to cache
    var data = {
      content: result
    };

    cached
      .set(cacheKey, config.cacheTtl.aMonth, JSON.stringify(data))
      .then(result => {
        results.info.cached = "success";
      })
      .catch(error => {
        results.info.cached = "failed";
      });

    return results;
  }
}

async function getInfo(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);
  var teamId = req.teamId;

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
    var result = {
      detail: null,
      news: null,
      column: null,
      video: null,
      table: null,
      programs: null,
      players: null,
      coach: null
    };

    // ----- Get team detail -----
    try {
      var detailData = await team.getDetail(teamId);
    } catch (error) {
      log.error(`${FILEPATH} - team API error: ${error}`);
    }

    if (detailData !== null) {
      result.detail = detailData[0];
    }

    // ----- Get team news -----
    try {
      var newsData = await news.getByTeam(teamId, TOURNAMENT.worldcup, 1, 5);
    } catch (error) {
      log.error(`${FILEPATH} - news API error: ${error}`);
    }

    if (newsData !== null) {
      result.news = newsData.content;
    }

    // ----- Get team column
    try {
      var columnData = await column.getByTeam(
        teamId,
        TOURNAMENT.worldcup,
        1,
        5
      );
    } catch (error) {
      log.error(`${FILEPATH} - column API error: ${error}`);
    }

    if (columnData !== null) {
      result.column = columnData.content;
    }

    // ----- Get team video
    try {
      var videoData = await video.getByTeam(1, 1, 5, 1, 1, 5);
    } catch (error) {
      log.error(`${FILEPATH} - video API error: ${error}`);
    }

    if (videoData !== null) {
      result.video = videoData.content;
    }

    // ----- Get team table
    try {
      var groupTable = await table.getGroupOfTeam(TOURNAMENT.worldcup, teamId);
    } catch (error) {
      log.error(`${FILEPATH} - table API error: ${error}`);
    }

    if (!helpers.isEmptyObject(groupTable)) {
      result.table = groupTable;
    }

    // ----- Get team programs
    try {
      var program = await programs.getByTeam(teamId, TOURNAMENT.worldcup, 28);
    } catch (error) {
      log.error(`${FILEPATH} - program API error: ${error}`);
    }

    if (!helpers.isEmptyObject(program)) {
      result.programs = program;
    }

    // ----- Get team players
    try {
      var players = await team.getPlayers(
        teamId,
        TOURNAMENT.worldcup2018.tournamentId
      );
    } catch (error) {
      log.error(`${FILEPATH} - team API error: ${error}`);
    }

    if (!helpers.isEmptyObject(players)) {
      result.players = players;
    }

    // ----- Get team coach
    try {
      var coach = await team.getCoach(
        teamId,
        TOURNAMENT.worldcup2018.tournamentId
      );
    } catch (error) {
      log.error(`${FILEPATH} - team API error: ${error}`);
    }

    if (!helpers.isEmptyObject(coach)) {
      result.coach = coach;
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
  getList,
  getInfo,
  deleteCache
};
