const mysql = require('mysql');

const log = require('../../../logging/index');
const config = require('../../config/index');

class MysqlClass {
    constructor(initdb) {
        this.mysqlPool = mysql.createPool(initdb);
    }

    read (query) {
        return new Promise((resolve, reject) => {
    
            this.mysqlPool.getConnection((error, connection) => {
    
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

    update (query) {
        return new Promise((resolve, reject) => {
    
            this.mysqlPool.getConnection((error, connection) => {
    
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

}

module.exports = MysqlClass;