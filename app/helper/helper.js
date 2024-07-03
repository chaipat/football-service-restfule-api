const moment = require("moment");
const base64 = require("base-64");

const config = require("../config/index");

var helpers = new Object();

/**
 * setLogName - ตั้งชื่อหัวข้อาำหรับ log ที่ใช้ใน log file
 * @param {String} method - HTTP Method
 * @param {String} path - request route URL
 * @param {Object} data - request data
 * @returns {String} log name pattern
 */
helpers.setLogName = (method, path, data = null) => {
  var requestData = [];
  var stringReqData = "-";

  if (data) {
    requestData = Object.getOwnPropertyNames(data);
    stringReqData = extractRequestData(requestData, data);
  }

  return `[${method} - ${path.replace("//", "//")} - ${stringReqData}] `;
};

/**
 * generateCacheKey - สร้าง keyname สำหรับใช้กับ caching system
 * @param {String} path - request route URL
 * @param {Object} data - request data
 * @returns {String} cache key pattern
 */
helpers.generateCacheKey = (path, data = null) => {
  var requestData = [];
  var stringReqData = "-";

  if (data) {
    requestData = Object.getOwnPropertyNames(data);
    stringReqData = extractRequestData(requestData, data);
  }

  var cachePrefix = base64.encode(config.REDIS_PREFIX_KEY);
  var cachePath = base64.encode(path);
  var stringReqData = base64.encode(extractRequestData(requestData, data));

  return `${cachePrefix}.${cachePath}.${stringReqData}`;
};

/**
 * extractRequestData - แยก request data ออกแล้วประกอบมาเป็น string
 * @param {Array} probs
 * @param {Object} data
 * @returns {String} request data string
 */
function extractRequestData(probs, data) {
  var stringReqData = "";

  if (probs.length !== 0) {
    probs.map(prop => {
      stringReqData += prop + ":" + data[prop] + "|";
    });
    return stringReqData;
  }

  return stringReqData;
}

helpers.isEmptyObject = obj => {
  if (obj === null || obj === undefined) {
    return true;
  }
  return !Object.keys(obj).length;
};

/**
 * Check publish date
 * @param {string datetime} startDate - field start_date in table
 * @param {string datetime} expireDate - field expire_date in table
 */
helpers.checkPublish = (startDate, expireDate) => {
  var currentTime = moment();

  if (
    startDate === "0000-00-00 00:00:00" &&
    expireDate === "0000-00-00 00:00:00"
  ) {
    return true;
  } else {
    var startPublish = moment(startDate);
    var endPublish = moment(expireDate);

    if (currentTime > startPublish && expireDate === "0000-00-00 00:00:00") {
      return true;
    } else if (currentTime > startPublish && currentTime < endPublish) {
      return true;
    }
  }

  return false;
};

helpers.addMomentDate = (data, fieldName) => {
  data.map(row => {
    var cd = moment(row[fieldName]).locale("th");
    var thaiYear = cd.year() + 543;
    row[`${fieldName}_th`] = cd.format(`D MMMM ${thaiYear} HH:mm`);
    row.date_fromnow = cd.fromNow();
  });

  return data;
};

module.exports = helpers;
