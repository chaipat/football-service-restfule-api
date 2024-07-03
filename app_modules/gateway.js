var express = require('express');
var config = require('../config/index');
var utils = require('../utils/index');
var log = require('../logging/index');
var request = require('request');
var dateFormat = require('dateformat');
var async = require('async');

var redisCluster = config.getRedisCluster();
var mysql_connection = config.getMySQLConnection();
var redisCaching = require('./redisCaching');
var mysqlModule = require('./mysqlModule');
var cacheKeyPrefix =
  config.getKeyType() + config.getKeyPrefix() + config.getKeyProjectName();

var gatewayModule = gatewayModule.prototype;

function getVideo(url) {
  return new Promise(function (resolve, reject) {
    request(url, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        resolve(body);
      } else {
        getVideo(url);
      }
    });
  });
}



/*function loadVideo(id) {
  return new Promise(function (resolve, reject) {
    request('http://videoapi.siamsport.co.th/v1/detail/' + id, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        resolve(body);
      } else {
        loadVideo(id);
      }
    });
  });
}*/


function gatewayModule() { }

//Gateway Auto
gatewayModule.getAuto = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-auto';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, clearCache, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          var data = {};

          async.series(
            [
              function (callback) {
                var query =
                  'SELECT `news_id`, `order_by`, `types`, `title`, `description`, ';
                query +=
                  ' `thumbnail`, `countview`, `status`, `lastupdate_date` ';
                query +=
                  ' FROM ss_highlight_news_mapping WHERE highlight_category_id = 17 AND status = 1 ';
                query += ' ORDER BY order_by LIMIT 4 ';

                mysqlModule.getData(query, function (error, result) {
                  if (error) return callback(error);

                  data = result;

                  for (var i in data) {
                    var picType = 'news';
                    var picture_size = {
                      fullsize: picType + '/' + data[i]['thumbnail'],
                      size128: 'size128/' + data[i]['thumbnail'],
                      size224: 'size224/' + data[i]['thumbnail'],
                      size304: 'size304/' + data[i]['thumbnail'],
                      size640: 'size640/' + data[i]['thumbnail']
                    };
                    data[i].picture_size = picture_size;
                  }

                  callback();
                });
              }, //end func.
              function (callback) {
                redisCaching.saveCache(res, cacheKey, data, function (
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function (erorr) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: 'success',
                      cache: 'redis',
                      cache_key: 'cacheKey'
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};


//Gateway gadgets
gatewayModule.getGadgets = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-gadgets';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          request(
            'http://gadgets.siamsport.co.th/gateway/json_data.php',
            function (error, response, body) {
              var objectBody = {};

              if (!error && response.statusCode == 200) {
                objectBody = JSON.parse(body);
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: 'success',
                      cache: 'cached redis',
                      cache_key: cacheKey
                    },
                    objectBody
                  )
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: 'success',
                      cache: 'cached redis',
                      cache_key: cacheKey
                    },
                    objectBody
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

//Gateway Siamdara
gatewayModule.getSiamdara = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-siamdara';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          request('http://www.siamdara.com/external/gengateway', function (
            error,
            response,
            body
          ) {
            var objectBody = {};

            if (!error && response.statusCode == 200) {
              objectBody = JSON.parse(body);
              return utils.printJSON(res, objectBody);
            } else {
              return utils.printJSON(res, objectBody);
            }
          });
        }
      }
    });
  }
};

//Gateway SBT
gatewayModule.getSbt = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-sbt';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          request('http://sbt.co.th/gen/gen_ss2.php', function (
            error,
            response,
            body
          ) {
            var objectBody = {};

            if (!error && response.statusCode == 200) {
              objectBody = JSON.parse(body);
              return utils.printJSON(res, objectBody);
            } else {
              return utils.printJSON(res, objectBody);
            }
          });
        }
      }
    });
  }
};

//Gateway FHM
gatewayModule.getFhm = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-fhm';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          request(
            'http://apis.fhm.in.th/api/get_new_fhm_in_siamsport2.php',
            function (error, response, body) {
              var objectBody = {};

              if (!error && response.statusCode == 200) {
                objectBody = JSON.parse(body);
                return utils.printJSON(res, objectBody);
              } else {
                return utils.printJSON(res, objectBody);
              }
            }
          );
        }
      }
    });
  }
};

//Gateway KingPower
gatewayModule.getKingPower = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-kingpower';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, clearCache, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          //get data from MySQL.
          var data = {};

          async.series(
            [
              function (callback) {
                var query =
                  'SELECT `news_id`, `order_by`, `types`, `title`, `description`, \
                             `thumbnail`, `countview`, `status`, `lastupdate_date` \
                              FROM ss_highlight_news_mapping WHERE highlight_category_id = 6 AND status = 1';

                mysqlModule.getData(query, function (error, result) {
                  if (error) return callback(error);

                  data = result;

                  for (var i in data) {
                    var picType = 'news';
                    var picture_size = {
                      fullsize: picType + '/' + data[i]['thumbnail'],
                      size128: 'size128/' + data[i]['thumbnail'],
                      size224: 'size224/' + data[i]['thumbnail'],
                      size304: 'size304/' + data[i]['thumbnail'],
                      size640: 'size640/' + data[i]['thumbnail']
                    };
                    data[i].picture_size = picture_size;
                  }

                  callback();
                });
              }, //end func.
              function (callback) {
                redisCaching.saveCache(res, cacheKey, data, function (
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function (erorr) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: 'success',
                      cache: 'redis',
                      cache_key: 'cacheKey'
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

//Gateway Atletico
gatewayModule.getAtletico = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-atletico';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, clearCache, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          //get data from MySQL.
          var data = {};

          async.series(
            [
              function (callback) {
                var query =
                  'SELECT `news_id`, `order_by`, `types`, `title`, `description`, \
                             `thumbnail`, `countview`, `status`, `lastupdate_date` \
                              FROM ss_highlight_news_mapping WHERE highlight_category_id = 7 AND status = 1';

                mysqlModule.getData(query, function (error, result) {
                  if (error) return callback(error);

                  data = result;

                  for (var i in data) {
                    var picType = 'news';
                    var picture_size = {
                      fullsize: picType + '/' + data[i]['thumbnail'],
                      size128: 'size128/' + data[i]['thumbnail'],
                      size224: 'size224/' + data[i]['thumbnail'],
                      size304: 'size304/' + data[i]['thumbnail'],
                      size640: 'size640/' + data[i]['thumbnail']
                    };
                    data[i].picture_size = picture_size;
                  }

                  callback();
                });
              }, //end func.
              function (callback) {
                redisCaching.saveCache(res, cacheKey, data, function (
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function (erorr) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: 'success',
                      cache: 'redis',
                      cache_key: 'cacheKey'
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

//Gateway Change
gatewayModule.getChang = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-chang';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, clearCache, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          var data = {};

          async.series(
            [
              function (callback) {
                var query =
                  'SELECT `news_id`, `order_by`, `types`, `title`, `description`, \
                             `thumbnail`, `countview`, `status`, `lastupdate_date` \
                              FROM ss_highlight_news_mapping WHERE highlight_category_id = 13 AND status = 1';

                mysqlModule.getData(query, function (error, result) {
                  if (error) return callback(error);

                  data = result;

                  for (var i in data) {
                    var picType = 'news';
                    var picture_size = {
                      fullsize: picType + '/' + data[i]['thumbnail'],
                      size128: 'size128/' + data[i]['thumbnail'],
                      size224: 'size224/' + data[i]['thumbnail'],
                      size304: 'size304/' + data[i]['thumbnail'],
                      size640: 'size640/' + data[i]['thumbnail']
                    };
                    data[i].picture_size = picture_size;
                  }

                  callback();
                });
              },
              function (callback) {
                redisCaching.saveCache(res, cacheKey, data, function (
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function (erorr) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: 'success',
                      cache: 'redis',
                      cache_key: 'cacheKey'
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

//Gateway Coke Cup
gatewayModule.getCokeCup = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-cokecup';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, clearCache, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          var data = {};

          async.series(
            [
              function (callback) {
                var query =
                  'SELECT `news_id`, `order_by`, `types`, `title`, `description`, \
                             `thumbnail`, `countview`, `status`, `lastupdate_date` \
                              FROM ss_highlight_news_mapping WHERE highlight_category_id = 15 AND status = 1';

                mysqlModule.getData(query, function (error, result) {
                  if (error) return callback(error);

                  data = result;

                  for (var i in data) {
                    var picType = 'news';
                    var picture_size = {
                      fullsize: picType + '/' + data[i]['thumbnail'],
                      size128: 'size128/' + data[i]['thumbnail'],
                      size224: 'size224/' + data[i]['thumbnail'],
                      size304: 'size304/' + data[i]['thumbnail'],
                      size640: 'size640/' + data[i]['thumbnail']
                    };
                    data[i].picture_size = picture_size;
                  }

                  callback();
                });
              },
              function (callback) {
                redisCaching.saveCache(res, cacheKey, data, function (
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function (erorr) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: 'success',
                      cache: 'redis',
                      cache_key: 'cacheKey'
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

//Gateway KingPowerCup 2018
gatewayModule.getKingPowersCup = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-kingpowercup';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, clearCache, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          //get data from MySQL.
          var data = {};

          async.series(
            [
              function (callback) {
                var query =
                  'SELECT `news_id`, `order_by`, `types`, `title`, `description`, \
                             `thumbnail`, `countview`, `status`, `lastupdate_date` \
                              FROM ss_highlight_news_mapping WHERE highlight_category_id = 24 AND status = 1';

                mysqlModule.getData(query, function (error, result) {
                  if (error) return callback(error);

                  data = result;

                  for (var i in data) {
                    var picType = 'news';
                    var picture_size = {
                      fullsize: picType + '/' + data[i]['thumbnail'],
                      size128: 'size128/' + data[i]['thumbnail'],
                      size224: 'size224/' + data[i]['thumbnail'],
                      size304: 'size304/' + data[i]['thumbnail'],
                      size640: 'size640/' + data[i]['thumbnail']
                    };
                    data[i].picture_size = picture_size;
                  }

                  callback();
                });
              }, //end func.
              function (callback) {
                redisCaching.saveCache(res, cacheKey, data, function (
                  error,
                  response
                ) {
                  if (error) return callback(error);
                  callback();
                });
              }
            ],
            function (erorr) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(
                    200,
                    {
                      status: 'success',
                      cache: 'redis',
                      cache_key: 'cacheKey'
                    },
                    data
                  )
                );
              }
            }
          );
        }
      }
    });
  }
};

//Gateway Bein
gatewayModule.getBeinVideo = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-bein';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }

  if (clearCache) {
    redisCaching.deleteCache(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {
          request(
            'http://sstv.siamsport.co.th/rss/list_bein.php?page=1&action=main',
            function (error, response, body) {
              if (!error && response.statusCode == 200) {
                var objectBody = {};
                objectBody = JSON.parse(body);
                return utils.printJSON(res, objectBody);
              } else {
                return utils.printJSON(res, objectBody);
              }
            }
          );
        }
      }
    });
  }
};

//Gateway Bundesliga
gatewayModule.getBundesliga = function (req, res, next) {
  var clearCache = req.query.clearCache;
  var errorCode = 500;
  var cacheKey = cacheKeyPrefix + 'gateway-bundesliga';

  if (clearCache === '' || typeof clearCache === 'undefined') {
    clearCache = false;
  }
  //clearCache = false;
  if (clearCache) {
    redisCaching.deleteCache(res, clearCache, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        if (reply) {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'success',
                cache: 'cache deleted',
                cache_key: cacheKey
              },
              null
            )
          );
        } else {
          return utils.printJSON(
            res,
            utils.getJSONObject(
              200,
              {
                status: 'fail',
                description:
                  'KEY ' + cacheKey + ' does not exist or already deleted.'
              },
              null
            )
          );
        }
      }
    });
  } else {
    redisCaching.cacheExist(res, cacheKey, function (error, reply) {
      if (error) {
        return utils.printJSON(
          res,
          utils.getJSONObject(errorCode, error.stack, null)
        );
      } else {
        //reply = false;
        if (reply) {
          redisCaching.getCache(res, cacheKey, function (error, result) {
            if (error) {
              return utils.printJSON(
                res,
                utils.getJSONObject(errorCode, error.stack, null)
              );
            } else {
              var json = JSON.parse(result);
              return utils.printJSON(
                res,
                utils.getJSONObject(
                  200,
                  {
                    status: 'success',
                    cache: 'cached redis',
                    cache_key: cacheKey
                  },
                  json
                )
              );
            }
          });
        } else {

          var data = {};
          let videos = [];
          let pos = [];
          async.series(
            [
              function (callback) {
                var query =
                  'SELECT nm.news_id, nm.order_by, nm.types, nm.title, nm.description, ';
                query +=
                  ' nm.thumbnail, nm.redirect_url, n.countview, nm.status, n.approve_date AS lastupdate_date ';
                query +=
                  ' FROM ss_highlight_news_mapping AS nm LEFT JOIN ss_news AS n ON n.news_id2 = nm.news_id WHERE nm.highlight_category_id = 23 AND nm.status = 1 ';
                query += ' ORDER BY nm.order_by LIMIT 8';

                mysqlModule.getData(query, function (error, result) {
                  if (error) return callback(error);

                  data = result;
                  for (var i in data) {
                    if (data[i].types === 'vdo') {
                      var picType = 'video';
                      var picture_size = {
                        fullsize: data[i]['thumbnail']
                      };
                      data[i].picture_size = picture_size;
                      videos.push({
                        index: parseInt(i),
                        news_id: data[i].news_id
                      });
                      if (data[i].news_id !== null) {
                        pos[data[i].news_id] = parseInt(i);
                      }


                      /*loadVideo(data[i].news_id).then(JSON.parse).then(function (result) {
                        var body = result.body[0];
                        data[i].title = body.title;
                        data[i].countview = body.view;
                        data[i].lastupdate_date = body.lastupdated_date;
                      });*/

                    } else {
                      var picType = 'news';
                      var picture_size = {
                        fullsize: picType + '/' + data[i]['thumbnail'],
                        size128: 'size128/' + data[i]['thumbnail'],
                        size224: 'size224/' + data[i]['thumbnail'],
                        size304: 'size304/' + data[i]['thumbnail'],
                        size640: 'size640/' + data[i]['thumbnail']
                      };
                      data[i].picture_size = picture_size;
                    }
                  }

                  /*let requests = videos.map(video => getVideo('http://videoapi.siamsport.co.th/v1/detail/' + video.news_id));
                  Promise.all(requests)
                    .then(responses => {
                      for (let response of responses) {
                        var res = JSON.parse(response);
                        var body = res.body[0];
                        data[pos[body.id]].title = body.title;
                        data[pos[body.id]].countview = body.view;
                        data[pos[body.id]].lastupdate_date = body.lastupdated_date;
                      }
                    });*/

                  callback();
                });
              }, //end func.
            
              function (callback) {
                let requests = videos.map(video => getVideo('http://videoapi.siamsport.co.th/v1/detail/' + video.news_id));
                Promise.all(requests)
                  .then(responses => {
                    for (let response of responses) {
                      var res = JSON.parse(response);
                      var body = res.body[0];
                      data[pos[body.id]].title = body.title;
                      data[pos[body.id]].countview = body.view;
                      data[pos[body.id]].lastupdate_date = body.lastupdated_date;
                    }
                  }).then(function () {
                    redisCaching.saveCache(res, cacheKey, data, function (
                      error,
                      response
                    ) {
                      if (error) return callback(error);
                      callback();
                    });
                  });

              }
            ],
            function (erorr) {
              if (error) {
                return utils.printJSON(
                  res,
                  utils.getJSONObject(errorCode, error.message, null)
                );
              } else {
                let requests = videos.map(video => getVideo('http://videoapi.siamsport.co.th/v1/detail/' + video.news_id));
                Promise.all(requests)
                  .then(responses => {
                    for (let response of responses) {
                      var res = JSON.parse(response);
                      var body = res.body[0];
                      data[pos[body.id]].title = body.title;
                      data[pos[body.id]].countview = body.view;
                      data[pos[body.id]].lastupdate_date = body.lastupdated_date;
                    }
                  }).then(function () {
                    return utils.printJSON(
                      res,
                      utils.getJSONObject(
                        200,
                        {
                          status: 'success',
                          cache: 'redis',
                          cache_key: 'cacheKey'
                        },
                        data
                      )
                    );
                  });


              }
            }
          );
        }
      }
    });
  }
};

module.exports = gatewayModule;
