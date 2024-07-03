/**
 * statistic
 * จัดการข้อมูลสถิติ เช่น ยอดวิว ยอดยแชร์
 * ในแต่ละ Function จะใช้ ES6 Promise เพื่อที่ให้สามารถ return data จาก code ที่เป็น Async ได้
 **/
const redis = require("redis");
const moment = require("moment");
const { promisify } = require("util");
const base64 = require("base-64");

const config = require("../../config/index");
const log = require("../../../logging/index");
const cached = require("../caching/redis");
const MySqlClass = require("../database/mysql.class");
const helpers = require("../../helper/helper");

const db = new MySqlClass(config.SS_MYSQL_CONNECTION_POOL);
const appMessage = config.appMessage;
const redisPrefix = config.REDIS_PREFIX_KEY;

async function updateCounter(updateInfo) {
  var mRedis = redis.createClient({
    host: config.REDIS_MASTER.host,
    port: config.REDIS_MASTER.port
  });

  var sRedis = redis.createClient({
    host: config.REDIS_SLAVE.host,
    port: config.REDIS_SLAVE.port
  });

  // เปลี่ยนคำสั่ง redis ที่จะใช้ในโปรแกรม ให้เป็น promise
  const hgetAsync = promisify(sRedis.hget).bind(sRedis);
  const hmsetAsync = promisify(mRedis.hmset).bind(mRedis);
  const hincrbyAsync = promisify(mRedis.hincrby).bind(mRedis);

  var cacheKeyString = `${updateInfo.section}-${updateInfo.type}-${
    updateInfo.id
  }`;
  var cacheKey = helpers.generateCacheKey(cacheKeyString);

  var now = moment().unix();
  // ตั้งเวลา queue ของตัวนับหน่วยเป็นวินาที
  var ttl = 10;
  // รอบของ queue แต่ละรอบนับจากเวลาปัจจุบันบวก ttl
  var endQueue = now + ttl;

  var updateResult = {
    updated: "success"
  };

  updateResult.cacheKey = cacheKey;

  // ดึง ttl ของตัวนับ counter ใน cache
  var countTtl = await hgetAsync(cacheKey, "countTTL");

  // เช็ตว่า counter มีใน cache หรือยัง ถ้ายังให้สร้างใหม่
  if (countTtl) {
    // add counter
    await hincrbyAsync(cacheKey, "count", 1);

    // ดึงข้อมูล counter
    var counter = await hgetAsync(cacheKey, "count");

    // ถ้าเวลาปัจจุบันมากกว่า ttl ของ cache counter ก็จะเอาข้อมูล counter ใน cache บันทึกลง database
    // แล้วเริ่มรอบการ cache counter ใหม่
    if (now > countTtl) {
      var fieldsToUpdate = updateInfo.counterFields.map(field => {
        return `${field} = ${field} + ${counter}`;
      });

      var queryString = `
            UPDATE ss_${updateInfo.section} 
            SET ${fieldsToUpdate}
            WHERE ${updateInfo.section}_id2 = ${updateInfo.id} `;

      var updateSuccess = await db.update(queryString);

      if (!updateSuccess) {
        updateResult.updated = "fail";
      } else {
        await hmsetAsync(cacheKey, { count: 0, countTTL: endQueue });
      }

      updateResult.counterStatus = "save to db";
    } else {
      updateResult.counter = counter;
      updateResult.countStatus = "in queue";
    }
  } else {
    await hmsetAsync(cacheKey, { count: 1, countTTL: endQueue });
    updateResult.countStatus = "new counter cache";
  }

  mRedis.quit();
  sRedis.quit();

  return updateResult;
}

async function getCounter(req) {
  var cacheKey = helpers.generateCacheKey(req.path);
  var cacheTTL = 5;
  var results = {};

  // --- If client request first page, get data from caching
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
    var queryString = `
        SELECT ${req.section}_id2 as ${req.section}_id, countview as view, share
        FROM ss_${req.section}
        WHERE ${req.section}_id2 = ${req.id}
        `;

    var data = await db.read(queryString);

    if (helpers.isEmptyObject(data)) {
      throw {
        code: 404,
        message: "Data not found."
      };
    }

    results = {
      info: {
        dataSource: appMessage.dataSource.mysql,
        cacheKey: cacheKey,
        path: req.path
      },
      data: {
        section: req.section,
        id: data[0].video_id,
        view: data[0].view,
        share: data[0].share
      }
    };

    // --- save only first page to cache
    var data = {
      content: results.data
    };

    cached
      .set(cacheKey, cacheTTL, JSON.stringify(data))
      .then(result => {
        results.info.cached = "success";
      })
      .catch(error => {
        results.info.cached = "failed";
      });

    return results;
  }
}

module.exports = {
  updateCounter,
  getCounter
};
