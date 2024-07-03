const redis = require('redis');
require('redis-delete-wildcard')(redis);
const log = require('../../../logging/index');
const config = require('../../config/index');

var master = redis.createClient({
    host: config.REDIS_MASTER.host,
    port: config.REDIS_MASTER.port
})

var slave = redis.createClient({
    host: config.REDIS_SLAVE.host,
    port: config.REDIS_SLAVE.port
})

var set = (key, expire=config.REDIS_DEFAULT_EXPIRED, value) => {
    return new Promise((resolve, reject) => {
        master.on('error', (error) => {
            log.error('Redis set connection error: ' + error);
            reject('master redis connection error');
        });
        master.setex(key, expire, value);
        resolve({status: 'success'});
    })
    
}

var get = (key) => {
    return new Promise((resolve, reject) => {
        slave.on('error', (error) => {
            log.error('Redis get connection error: ' + error);
            reject('slave redis connection error');
        });

        slave.get(key, (error, reply) => {
            if (error) {
                log.error('Redis get error: ' + error);
                reject({errorIssue: 'Redis internal error', errorMessage: error});
            }
            //slave.quit();
            resolve(reply);
        });
    });
}

var deleteByPath = (path) => {
    
    return new Promise((resolve, reject) => {
        master.on('error', (error) => {
            log.error('Redis delete connection error: ' + error);
            reject('master redis connection error');
        });

        master.delwild(`*${path}*`, (error, numberOfDeletedKeys) => {
            if (error) {
                log.error('Redis delete error: ' + error);
                reject({errorIssue: 'Redis delete by path error', errorMessage: error});
            }
            resolve(numberOfDeletedKeys);
        })
    });
};

module.exports = {set, get, deleteByPath};