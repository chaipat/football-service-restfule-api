const mysql = require('mysql');

const log = require('../../../logging/index');
const config = require('../../config/index');

const mysqlPool = mysql.createPool(config.STAGING_MYSQL_CONNECTION_POOL);

function read (query) {
    return new Promise((resolve, reject) => {

        mysqlPool.getConnection((error, connection) => {

            if (error) {
                log.error('MYSQL connection error: ' + error);
                reject(error);
            }

            var data = [];
            
            connection.query(query, (error, result) => {
                if (error) {
                    log.error('MYSQL query error: ' + error);
                    connection.release();
                    reject(error);
                }

                result.map((res) => {
                    data.push(res);
                })

                connection.release();

                resolve(data);

            });
        });
    });
}

function update (query) {
    return new Promise((resolve, reject) => {

        mysqlPool.getConnection((error, connection) => {

            if (error) {
                log.error('MYSQL connection error: ' + error);
                reject(error);
            }
            
            connection.query(query, (error, result) => {
                if (error) {
                    log.error('MYSQL query error: ' + error);
                    connection.release();
                    reject(error);
                }

                connection.release();

                resolve(result.changedRows);

            });
        });
    });
}

module.exports = {read, update}