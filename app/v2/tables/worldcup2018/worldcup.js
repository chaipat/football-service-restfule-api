const moment = require("moment");
const base64 = require("base-64");

const config = require("../../../config/index");
const TOURNAMENT = require("../../../config/tournament");
const log = require("../../../../logging/index");
const helpers = require("../../../helper/helper");
const cached = require("../../caching/redis");
const MySqlClass = require("../../database/mysql.class");

const errorMessge = config.errorMessage;
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;

const db = new MySqlClass(config.SS_MYSQL_CONNECTION_POOL);

async function getTables(req) {
  var logName = helpers.setLogName(req.method, req.path, req.query);
  var cacheKey = helpers.generateCacheKey(req.path, req.query);

  var group = req.query.group;
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
    var whereGroup = "";

    if (group !== "all") {
      whereGroup = `AND ss_group.group_name_en = 'Group ${group.toUpperCase()}'`;
    }

    var queryItems = `
        SELECT ss_standing.tournament_id, ss_standing.round, ss_standing.team_id, ss_standing.team, 
        ss_standing.position, ss_standing.overall_gp as gp, ss_standing.overall_w as w, ss_standing.overall_d as d, 
        ss_standing.overall_l as l, ss_standing.overall_gs as gs, ss_standing.overall_ga as ga, ss_standing.gd as gd, 
        ss_standing.p as pts, ss_team.team_name_th, ss_team.team_name_en, ss_team.team_logo,
        ss_tournament.tournament_name_th, ss_tournament.tournament_name_en, 
        ss_group.group_name_th, ss_group.group_name_en
        FROM ss_standing
        LEFT JOIN ss_team ON ss_standing.team_id = ss_team.team_id
        LEFT JOIN ss_tournament ON ss_tournament.tournament_id = ss_standing.tournament_id
        LEFT JOIN ss_group ON ss_group.group_id = ss_standing.group_id
        WHERE ss_standing.tournament_id =  '${TOURNAMENT.worldcup}'
        ${whereGroup}
        order by ss_standing.group_id, ss_standing.p desc, ss_standing.position;
        `;

    var tables = await db.read(queryItems);

    if (helpers.isEmptyObject(tables)) {
      throw {
        code: 400,
        message: "data not found."
      };
    }

    var result = {};

    if (group === "all") {
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

      tables.map(row => {
        var groupName = row.group_name_en.substr(-1, 1).toLowerCase();
        if (groupTable.hasOwnProperty(groupName)) {
          groupTable[groupName].push(row);
        }
      });

      result = groupTable;
    } else {
      result = tables;
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
  getTables,
  deleteCache
};
