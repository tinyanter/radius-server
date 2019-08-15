let Bluebird = require("bluebird");
let redis = Bluebird.promisifyAll(require('redis'));
import {CoreConfig} from "../../core/core-config";
import {LogReport} from "../../utils/log-util/log-report";


const platformDbConfig = CoreConfig.getConfig('platformdb');
let redisConfig: any = {
    host: platformDbConfig.redis.host,
    port: platformDbConfig.redis.port,
    retry_strategy: function (options:any) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            console.log('Redis server refused the connection')
        }
        if (options.total_retry_time > 1000) {
            console.log('Redis retry time exhausted')
        }
        if (options.attempt > 10) {
            console.log('Redis retry attempt exhausted')
        }
        return Math.min(options.attempt * 500, 3000);
    }
};
if (platformDbConfig.redis.auth) {
    redisConfig.auth_pass = platformDbConfig.redis.auth
}
let redisClient = redis.createClient(redisConfig);

redisClient.on('error', function (err: any) {
    console.log(`Redis Error ${err}`);
    LogReport.report(`连接redis出错[${JSON.stringify(err)}]`);
    //throw new Error(`Redis Error ${err}`);
});

export {
    redisClient
}