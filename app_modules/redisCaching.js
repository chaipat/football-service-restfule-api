var exress = require('express');
var config = require('../config/index');
var utils = require('../utils/index');

var redisCaching = redisCaching.prototype;

function redisCaching() {}



redisCaching.cacheExist = function (res, key, callback) {

  var redis = config.getRedisCluster();
  redis.once('connect', function() {
    redis.exists(key, function(err, reply) {
      if(err) {
        callback(err, null);
        redis.disconnect();
      } else {
        callback(null, reply); // reply:  1 if key exist. 0 if key not exist
        redis.disconnect();
      }
    });
  });
}

redisCaching.getCache = function(res, key, callback) {
  var redis = config.getRedisCluster();
  redis.once('connect', function() {
    redis.get(key, function (err, data) {
      if (err) {
        callback(err, null);
        redis.disconnect();
      } else {
        callback(null, data);
        redis.disconnect();
      }
    });
  })
}

redisCaching.saveCache = function(res, key, data, callback, cacheExpire=60) {
  var redis = config.getRedisCluster();
  redis.once('connect', function() {
        //redis.set(key, JSON.stringify(data));
        redis.set(key, JSON.stringify(data), function(err) {
          if(err) {
            callback(err, null);
          } else {
            redis.expire(key, cacheExpire, function() {
              callback(null, data);
              redis.disconnect();
            });
          }
        });
  });
  //redis.disconnect();
}

redisCaching.deleteCache = function (res, key, callback ) {
  var redis = config.getRedisCluster();
  redis.once('connect', function() {
    redis.exists(key, function(err, reply) {
      if(err) {
        callback(err, null);
        redis.disconnect();
      } else {
        if (reply) {  // reply:  1 if key exist. 0 if key not exist
            redis.del(key);
            callback(null, reply);
            redis.disconnect();
        } else {
            callback(null, reply);
            redis.disconnect();
        }
      }
    });
  })

}

module.exports = redisCaching;
