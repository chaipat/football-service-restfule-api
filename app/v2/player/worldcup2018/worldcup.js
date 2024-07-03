const base64 = require("base-64");

const config = require("../../../config/index");
const TOURNAMENT = require("../../../config/tournament");
const log = require("../../../../logging/index");
const helpers = require("../../../helper/helper");
const cached = require("../../caching/redis");

const player = require("../profile");
const team = require("../../team/team");

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;
const FILEPATH = `${__dirname}/${__filename}`;

async function getInfo(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);
  var playerId = req.playerId;

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
      profile: null,
      team: null,
      stats: null
    };

    // ----- Get Player info -----
    try {
      var profileData = await player.getProfile(playerId);
    } catch (error) {
      log.error(`${FILEPATH} - player API error: ${error}`);
    }

    if (profileData !== null) {
      result.profile = profileData[0];
    } else {
      throw { code: "500", message: "no player data" };
    }

    // ----- Get Nationality -----
    try {
      var nation = await team.getNationality(
        result.profile.country_id,
        TOURNAMENT.worldcup2018.tournamentId
      );
    } catch (error) {
      log.error(`${FILEPATH} - team API error: ${error}`);
    }

    if (nation !== null) {
      result.team = nation[0];
    }

    // ----- Get Player stats -----
    try {
      var statData = await player.getStats(
        playerId,
        TOURNAMENT.worldcup2018.tournamentId
      );
    } catch (error) {
      log.error(`${FILEPATH} - player API error: ${error}`);
    }

    if (statData !== null) {
      result.stats = statData[0];
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
  getInfo,
  deleteCache
};
