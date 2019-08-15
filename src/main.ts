import * as fs from "fs";
import {CoreConfig} from "./core/core-config";
import {RadiusAccount} from "./radius-account";
import {RadiusAuth} from "./radius-auth";
import {RadiusSocket} from "./radius-socket";
import {Monitor} from "./controllers/monitor"

const coreConfig = CoreConfig.getConfig("server");
const radiusCfg = coreConfig['radius'];
const radiusCenterCfg = coreConfig['radiusCenter'];

(async function run() {
    try {
        let monitor: Monitor = new Monitor(coreConfig.monitorInterval * coreConfig.acctInterval * 1000);
        monitor.run();

        //注册Radius
        let radiusIo: RadiusSocket = new RadiusSocket(radiusCenterCfg['ip'], radiusCenterCfg['port']);
        radiusIo.run();

        //启动Radius Authentication
        let radiusAuth: RadiusAuth = new RadiusAuth(radiusCfg['port']['authPort']);
        await radiusAuth.start();
        console.log('启动Radius认证服务成功');

        //启动Radius Accounting
        let radiusAcc: RadiusAccount = new RadiusAccount(radiusCfg['port']['accPort']);
        await radiusAcc.start();
        console.log('启动Radius记账服务成功');

        //监控配置文件，实现动态加载

    } catch (e) {
        console.error('服务启动失败,进程退出');
        process.exit(-1);
    }
})();
