# Siamsport Service RESTful API
Siamsport Service is the project which provide data of football's news, column, video or other sport in JSON Format.

***Port Listener:*** 8017  

### How to install NodeJS & NPM
```sh
//CENT OS
$ yum -y install nodejs
$ sudo yum install nodejs npm --enablerepo=epel
```

### How to setup Express Module  
**Ref:** http://expressjs.com/en/starter/installing.html  

### Express application generator  
**Ref:** http://expressjs.com/en/starter/generator.html

***Install express generator***
```sh
$ npm install express-generator -g  
```
***Generate siamsport-service-restfule-api***
```sh
$ express siamsport-service-restfule-api
```
***Install Dependencies***
```sh
$ cd siamsport-service-restfule-api && npm install  
```
***Start Service***
```sh
$ DEBUG=siamsport-service-restfule-api:* npm start  
```

### Install MySQL
**Ref:** https://www.npmjs.com/package/mysql  
```sh
$ npm install mysql
```

### Install Redis Cluster Module
**Ref:** https://www.npmjs.com/package/ioredis  
```sh
$ npm install ioredis
```

### Install Winston Logging Module
**Ref:** https://www.npmjs.com/package/winston
```sh
$ npm install winston
$ npm i winston-daily-rotate-file
```

### Install Async Module
**Ref:** https://www.npmjs.com/package/async  
**Ref:** http://www.sebastianseilund.com/nodejs-async-in-practice  
**Ref:** http://blog.vullum.io/javascript-flow-callback-hell-vs-async-vs-highland/  
```sh
$ npm install async
```

### Install Dateformat Module  
**Ref:** https://www.npmjs.com/package/dateformat  
```sh
$ npm install dateformat  
```

### Install Request Module  
**Ref:** https://www.npmjs.com/package/request  
```sh
$ npm install request  
```

### Install PM2 Module  
**Ref:** https://www.npmjs.com/package/pm2  
```sh
$ npm install pm2 -g  
```

### Install PMX Module  
**Ref:** http://docs.keymetrics.io/docs/usage/install-pmx/
```sh
$ npm install pmx --save  
```
### Install sort-object Module  
**Ref:** https://www.npmjs.com/package/sort-object  
```sh
$ npm install sort-object  
```
### Install paginator Module  
**Ref:** https://www.npmjs.com/package/paginator  
```sh
$ npm install paginator  
```

### Edit Permission for FTP  
```sh
$ chmod -R 0775 siamsport-service-restfule-api  
$ chown -R root.sftp_users siamsport-service-restfule-api/  
```

### How to start service  
***Staging Server***
```sh
$ cd /app/services/nodejs/siamsport-service-restfule-api/
$ DEBUG=siamsport-service-restfule-api:* npm start
OR
$ node --expose-gc --max_old_space_size=2048 ./bin/www
```

### How to start service with PM2 Module
```sh
$ cd /app/services/nodejs/siamsport-service-restfule-api/  
$ pm2 start ./bin/www -i max --watch --name="Siamsport2017Service" --node-args="--expose-gc --max_old_space_size=2048"
```

Parameters which you can pass to help the situation are : (Check this [blog])
* ***--nouse-idle-notification*** which prevents running GC constantly and  
* ***--expose-gc*** which will allow you to run GC from your code.  
* ***--trace-gc --trace-gc-verbose*** Here is the trace left by gc during one of those times where there was a long gc pause in the process  

### How to stop service with PM2 Module
***Staging Server***
```sh
$ cd /app/services/nodejs/siamsport-service-restfule-api/  
$ pm2 stop Siamsport2017Service  
$ pm2 delete Siamsport2017Service  
```

### Database  
***Staging Server***
> URL:   
> Username:   
> Password:   
> DB:   

***Production Server***
> URL:     
> Username:   
> Password:   
> DB:  

### Check Service Process
```sh
$ netstat -nlp | grep 8017  
$ kill [PID]  
```

[blog]: <http://blog.caustik.com/2012/04/11/escape-the-1-4gb-v8-heap-limit-in-node-js/>  
