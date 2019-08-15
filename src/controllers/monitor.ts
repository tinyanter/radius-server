import {OfflineParameter} from "../interface/login"
import {ApiCaller} from "../lib/api-caller-http"
import {CoreConfig} from "../core/core-config";
import {Base} from "./base";
const serverConfig = CoreConfig.getConfig("server");

class Monitor extends Base {
    private interval: number;
    private httpHandle: ApiCaller;

    constructor(interval: number) {
        super();
        this.interval = interval;
        this.httpHandle = new ApiCaller();
    }

    run() {
        setInterval(async () => {
            await this.checkLoginStatus();
            await this.checkUserStatus();
        }, this.interval);
    }

    private async checkLoginStatus() {
        console.log(`===巡检重试队列开始`);
        let loop: number = 0;
        let total: number = 0;
        while (1) {
            try {
                let element: string = await this.peekQueue(serverConfig.list['loginList'], loop - total);
                console.log(`重试第${loop}条 ${element}`);
                if (!element) {
                    break;
                } else {
                    let data: any = JSON.parse(element);
                    let key: string = `${data.body.uid}|${data.body.session}`;
                    let url: string;
                    //检查用户是否已经下线，如已下线则将online改为offline
                    if (data.type === 'login' && await this.getCache(key)) {
                        url = serverConfig.radiusCenter.online;
                    } else {
                        url = serverConfig.radiusCenter.offline;
                    }
                    let result: any = await this.httpHandle.post(url, data.body);
                    if (0 !== result.errCode) {
                        console.error(`记录[${element}]重试失败--[${JSON.stringify(result)}]}`);
                    } else {
                        await this.rmQueue(serverConfig.list['loginList'], element);
                        console.log(`第${loop}条重试成功`);
                        total++;
                    }
                }
            } catch (e) {
                console.error(`第${loop}条重试失败--[${JSON.stringify(e)}]`);
                break;
            }
            loop++;
        }
        console.log(`===巡检重试队列结束,共检查记录${loop}条,成功[${total}]条`);
    }

    private async checkUserStatus() {
        try {
            console.log(`===巡检在线状态开始`);
            let expiredTm: number = serverConfig.acctInterval * serverConfig.monitorInterval * 1000;
            let kickCnt: number = 0;
            let loop: number = 0;
            while (1) {
                try {
                    let element: string = await this.peekQueue(serverConfig.list['index'], loop - kickCnt);
                    console.log(`检查第${loop}条 ${element}`);
                    if (!element) {
                        break;
                    } else {
                        //根据索引获取账单详情
                        let acctData: string = await this.getCache(element);
                        let acctJson: any = JSON.parse(acctData);

                        //判断最后一次更新时间距离现在是否已超出过期时间， 如果是则修改用户登录状态并将用户账单置为stop
                        if (Date.now() - acctJson.lastUpdateTime >= expiredTm) {
                            kickCnt++;
                            //修改用户登录状态(设置为下线)
                            let [uid, source] = acctJson.data.usertoken.split('|');
                            let logout: OfflineParameter = {
                                uid: uid,
                                source: source,
                                session: acctJson.data.sessionId,
                                nas_ip: acctJson.data.nas_ip
                            };
                            await this.httpHandle.post(serverConfig.radiusCenter.offline, logout);
                            console.log(`将[${uid}|${acctJson.data.sessionId}状态置为下线`);
                            //直接将缓存中的账单类型由update改为stop
                            acctJson.data.action = 'accountingStop';
                            await this.enQueue(serverConfig.list['acctList'], JSON.stringify(acctJson.data));
                            await this.rmQueue(serverConfig.list['index'], element);
                            await this.delCache(element);
                        }
                    }
                } catch (e) {
                    console.error(`第${loop}条检查失败--[${JSON.stringify(e)}]`);
                }
                loop++;
            }
            console.log(`===巡检在线状态结束,共检查记录${loop}条,${kickCnt}个用户被踢下线`);

        } catch (e) {
            console.error(e);
            console.error(`巡检在线状态失败`);
        }
    }
}

export {
    Monitor
}