const base64 = require("base-64");
const moment = require("moment");

const config = require("../../../config/index");
const TOURNAMENT = require("../../../config/tournament");
const log = require("../../../../logging/index");
const helpers = require("../../../helper/helper");
const cached = require("../../caching/redis");

const news = require("../../news/news");
const video = require("../../video/video");
const column = require("../../column/column");
const analysis = require("../../analysis/analysis");
const table = require("../../tables/table");
const stats = require("../stats");
const players = require("../../player/profile");

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;
const FILEPATH = `${__dirname}/${__filename}`;

async function getHome(req) {
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
    var result = {
      highlight: null,
      video: null,
      analysis: null,
      column: null,
      table: null,
      gateway: {
        news: [],
        video: []
      }
    };

    // ----- Get Highlight -----
    try {
      var highlightData = await news.getHighLight(
        TOURNAMENT.worldcup2018.highLight_catId.news
      );
    } catch (error) {
      log.error(`${FILEPATH} - news API error: ${error}`);
    }

    if (!helpers.isEmptyObject(highlightData)) {
      result.highlight = highlightData;
    }

    // ----- Get Video ----
    try {
      var videoConfig = TOURNAMENT.worldcup2018.video;

      var videoData = await video.getHighLight(
        videoConfig.catId,
        videoConfig.siteId
      );
    } catch (error) {
      log.error(`${FILEPATH} - video API error: ${error}`);
    }

    if (!helpers.isEmptyObject(videoData)) {
      result.video = videoData;
    }

    // // ----- Get matches analysis -----
    try {
      var matches = await analysis.getByTournament(TOURNAMENT.worldcup, 28);
    } catch (error) {
      log.error(`${FILEPATH} - analysis API error: ${error}`);
    }

    if (!helpers.isEmptyObject(matches)) {
      helpers.addMomentDate(matches, "match_date");

      // เอาเฉพาะวิเคราะห์ของวันนี้
      var currentMatches = matches.filter(row => {
        return (
          moment(row.match_date).format("YYYY-MM-DD") ==
          moment().format("YYYY-MM-DD")
        );
      });

      // เรียงตาม match number
      currentMatches.sort((a, b) => {
        return a["match_number"] - b["match_number"];
      });
      result.analysis = currentMatches;
    }

    // // ----- Get Column -----
    try {
      var columnData = await column.getHighlight(
        TOURNAMENT.worldcup2018.highLight_catId.column
      );
    } catch (error) {
      log.error(`${FILEPATH} - column API error: ${error}`);
    }

    if (!helpers.isEmptyObject(columnData)) {
      result.column = columnData;
    }

    // ----- Get Table -----
    try {
      var tableData = await table.getByTournament(
        TOURNAMENT.worldcup2018.tournamentId,
        "all"
      );
    } catch (error) {
      log.error(`${FILEPATH} - table API error: ${error}`);
    }

    if (!helpers.isEmptyObject(tableData)) {
      var groupTable = {
        a: [],
        b: [],
        c: [],
        d: [],
        e: [],
        f: [],
        g: [],
        h: []
      };

      tableData.map(row => {
        var groupName = row.group_name_en.substr(-1, 1).toLowerCase();
        if (groupTable.hasOwnProperty(groupName)) {
          groupTable[groupName].push(row);
        }
      });

      result.table = groupTable;
    }

    // ----- Get Gateway -----
    try {
      var gatewayData = await news.getHighLightGateway(
        TOURNAMENT.worldcup2018.highLight_catId.gateway
      );
    } catch (error) {
      log.info(`${FILEPATH} - news API error: ${error}`);
    }

    if (!helpers.isEmptyObject(gatewayData)) {
      gatewayData.map(row => {
        if (row.types === "news") {
          result.gateway.news.push(row);
        } else {
          result.gateway.video.push(row);
        }
      });
    }

    result.gateway.video.map(row => {
      row.picture_size = {
        fullsize: `uploads/video/${row.thumbnail}`,
        size128: `uploads/size128/${row.thumbnail}`,
        size224: `uploads/size224/${row.thumbnail}`,
        size304: `uploads/size304/${row.thumbnail}`,
        size640: `uploads/size640/${row.thumbnail}`
      };
    });

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

async function getStats(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);
  var requestStat = req.query.requestStat;

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
    var statData = {
      goal: null,
      assist: null
    };

    // ----- Get Player info -----
    if (requestStat !== "all") {
      try {
        statData[requestStat] = await stats.getStats(
          TOURNAMENT.worldcup2018.tournamentId,
          requestStat
        );
      } catch (error) {
        throw { code: 500, message: error };
      }

      if (!statData[requestStat]) {
        throw {
          code: 500,
          message: `request stat of {${requestStat}} not found`
        };
      }

      // get goal or assist match events
      try {
        var getStatEvents = await Promise.all(
          statData[requestStat].map(async row => {
            row.match_events = await players.getStatsDetail(
              row.player_id,
              TOURNAMENT.worldcup2018.tournamentId,
              requestStat
            );
          })
        ).then(completed => {
          result = statData;
        });
      } catch (error) {
        log.error(`${FILEPATH} - tournament API error: ${error}`);
      }
    } else {
      try {
        statData.goal = await stats.getStats(
          TOURNAMENT.worldcup2018.tournamentId,
          "goal"
        );

        var getStatEvents = await Promise.all(
          statData.goal.map(async row => {
            row.match_events = await players.getStatsDetail(
              row.player_id,
              TOURNAMENT.worldcup2018.tournamentId,
              "goal"
            );
          })
        ).then(completed => {
          result.goal = statData.goal;
        });

        statData.assist = await stats.getStats(
          TOURNAMENT.worldcup2018.tournamentId,
          "assist"
        );

        var getStatEvents = await Promise.all(
          statData.assist.map(async row => {
            row.match_events = await players.getStatsDetail(
              row.player_id,
              TOURNAMENT.worldcup2018.tournamentId,
              "assist"
            );
          })
        ).then(completed => {
          result.assist = statData.assist;
        });
      } catch (error) {
        log.error(`${FILEPATH} - tournament API error: ${error}`);
      }
      result = statData;
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
  getHome,
  getStats,
  deleteCache
};
