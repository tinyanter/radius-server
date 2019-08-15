import {CoreConfig} from "../core/core-config";
import {ApiCaller} from '../lib/api-caller-http';
import {AccountingDocument} from "../interface/global";
import {OnlineParameter, OfflineParameter} from "../interface/login"
import {Base} from "./base";
import {ErrorCode, errorFactory} from '../lib/error-code';

const apiCaller: ApiCaller = new ApiCaller();
const serverConfig = CoreConfig.getConfig("server");

class Accounting extends Base {

    /**
     * 设置记帐包cache 到本地
     * @param packet
     * @returns {Promise<void>}
     */
    private async setAcctPacketCache(packet: AccountingDocument): Promise<boolean> {
        let userInfo: string = packet['usertoken'];
        let uid: string = userInfo.split("|")[0];
        let key: string = `${uid}|${packet['sessionId']}`;
        try {
            let accData: any = {
                data: packet,
                accountTime: 0,
                lastUpdateTime: Date.now()
            };

            let cacheData: string = await this.getCache(key);
            if (cacheData) {
                console.log(`此包可能是延迟包，忽略[${key}]`);
                return false;
            } else {
                console.log(`设置记账包 [${key}]`);
                await this.setCache(key, JSON.stringify(accData));

                //账单索引入队，用于巡检
                await this.enQueue(serverConfig.list['index'], key);
                return true;
            }
        } catch (e) {
            throw e;
        }
    }

    /**
     * 更新本地cache记帐包
     * @param packet
     * @returns {Promise<boolean>}
     */
    private async updateAcctPacketCache(packet: AccountingDocument): Promise<boolean> {
        let userInfo = packet['usertoken'];
        let uid = userInfo.split("|")[0];
        let key: string = `${uid}|${packet.sessionId}`;
        let ret: boolean = false;
        let acctData: any = {
            data: packet,
            accountTime: 0,
            lastUpdateTime: Date.now()
        };

        console.log(`更新记帐包[${key}]`);
        try {
            let cacheData: string = await this.getCache(key);
            if (cacheData) {
                let cacheJson = JSON.parse(cacheData);
                if (packet.sessionTime - cacheJson.accountTime >= serverConfig.deducationUnit) {
                    acctData.accountTime = packet.sessionTime;
                    ret = true;
                } else {
                    acctData.accountTime = cacheJson.accountTime;
                }
            }

            await this.updateCache(key, JSON.stringify(acctData));

        } catch (e) {
            console.error(`更新账单失败`);
            throw e;
        }
        return ret;
    }

    private async deleteAcctPacketCache(key: string) {

        console.log(`删除记帐包[${key}]`);
        try {
            await this.delCache(key);
            //从索引队列中移除该索引
            await this.rmQueue(serverConfig.list['index'], key);
        } catch (e) {
            throw e;
        }
    }

    private async reCreateCache(packet: any) {
        try {
            let [uid, source] = packet.attributes['User-Name'].split("|");
            let selfToken = this.makeToken({
                uid: uid,
                source: source
            });
            if (!this.validationToken(selfToken)) {
                throw "token 签发者不被信任";
            }
            let accInfo: any = await this.querylastRecharge(uid, selfToken);

            let {baseTime, expireTime, expireType} = accInfo['data'];
            let data: any = {
                balanceType: expireType,
                baseTime: baseTime,
                expireTime: expireTime,
                radiusToken: selfToken
            };
            await this.setCache(packet.attributes['User-Name'], JSON.stringify(data));
            accInfo['data']['radiusToken'] = selfToken;
            return accInfo['data'];
        } catch (e) {
            console.error(e);
            throw errorFactory(ErrorCode.RadiusError.createCacheError);
        }
    }

    private async getUserCache(packet: any) {
        let [uid, source] = packet.attributes['User-Name'].split('|');
        try {
            let result = await this.getCache(`${uid}|${source}`);
            if (null === result) {
                console.log(`缓存中未找到用户信息，重新生成`);
                return await this.reCreateCache(packet);
            }
            return JSON.parse(result);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    async onAccountingRequest(packet: any) {
        try {
            let accountingType = packet.attributes['Acct-Status-Type'];
            if ('Accounting-On' === accountingType) {
                return;
            }
            let [uid, source] = packet.attributes['User-Name'].split('|');
            let userAttribute: any = await this.getUserCache(packet);
            packet.attributes['Platform-UserId'] = uid;
            packet.attributes['Platform-Source'] = source;
            packet.attributes['Platform-BalanceType'] = userAttribute['balanceType'] || userAttribute['expireType'];
            packet.attributes['Platform-Expired'] = userAttribute['expireTime'];
            packet.attributes['Platform-BaseTime'] = userAttribute['baseTime'];

            switch (accountingType) {
                case "Start":
                    await this.onAccountingStart(packet);
                    break;
                case "Interim-Update":
                    await this.onAccountingUpdate(packet, userAttribute);
                    break;
                case "Stop":
                    await this.onAccountingStop(packet);
                    break;
                default:
                    console.error('计费请求无法识别', accountingType);
            }
        } catch (e) {
            throw e;
        }
    }

    /**
     * 向radius-center发送用户登录信息
     * @param loginData
     */
    private async online(loginData: OnlineParameter) {
        console.log(`向radius-center发送登录信息 ${JSON.stringify(loginData)}`);
        try {
            let result: any = await apiCaller.post(serverConfig.radiusCenter.online, loginData);
            if (0 !== result.errCode) {
                console.error(`[${JSON.stringify(loginData)}]登录失败--[${JSON.stringify(result)}]}`);
            } else {
                return;
            }
        } catch (e) {
            console.error(`[${JSON.stringify(loginData)}]登录失败--[${JSON.stringify(e)}]`);
        }
        //radius-center返回失败或网络失败，数据入队，巡检时再次重试
        let data: any = {body: loginData, type: 'login'};
        await this.enQueue(serverConfig.list['loginList'], JSON.stringify(data));
    }

    private async offline(logoutData: OfflineParameter) {
        console.log(`向radius-center发送下线信息 ${JSON.stringify(logoutData)}`);
        try {
            let result: any = await apiCaller.post(serverConfig.radiusCenter.offline, logoutData);
            if (0 !== result.errCode) {
                console.error(`[${JSON.stringify(logoutData)}]下线失败--[${JSON.stringify(result)}]}`);
            } else {
                return;
            }
        } catch (e) {
            console.error(`[${JSON.stringify(logoutData)}]下线失败--[${JSON.stringify(e)}]`);
        }
        //radius-center返回失败或网络失败，数据入队，巡检时再次重试
        let data: any = {body: logoutData, type: 'logout'};
        await this.enQueue(serverConfig.list['loginList'], JSON.stringify(data));
    }

    /**
     * 计费开始时
     * @param packet
     */
    private async onAccountingStart(packet: any) {
        let [uid, source] = packet.attributes['User-Name'].split('|');
        let onlineInfo: OnlineParameter = {
            uid: uid,
            source: source,
            session: packet.attributes['Acct-Session-Id'],
            nas_ip: packet.attributes['NAS-IP-Address'],
        };

        let acctPacket: AccountingDocument = {
            action: 'accountingStart',
            usertoken: packet.attributes['User-Name'],
            userIp: packet.attributes['Framed-IP-Address'],
            nas_ip: packet.attributes['NAS-IP-Address'],
            protocol: packet.attributes['Framed-Protocol'],
            balanceType: packet.attributes['Platform-BalanceType'],
            expired: packet.attributes['Platform-Expired'],
            sessionId: packet.attributes['Acct-Session-Id'],
            sessionTime: packet.attributes['Acct-Session-Time'] || 0,
            baseTime: packet.attributes['Platform-BaseTime'],
            inputOctets: packet.attributes['Acct-Input-Octets'],
            outputOctets: packet.attributes['Acct-Output-Octets'],
            inputPackets: packet.attributes['Acct-Input-Packets'],
            outputPackets: packet.attributes['Acct-Output-Packets']
        };

        let isSet: boolean = await this.setAcctPacketCache(acctPacket);
        if (isSet) {
            this.sendAccounting(acctPacket);
            this.online(onlineInfo);
        }
    }

    /**
     * 计费更新时候
     * @param packet
     */
    private async onAccountingUpdate(packet: any, cache: any) {
        let ret: boolean = true;
        try {
            await this.checkExpiredStatus(packet, cache);
        } catch (e) {
            if (e.code !== ErrorCode.AccountError.expiredError.code) {
                console.error(`检查用户帐户失败:[${e.toString()}]`);
                throw errorFactory(ErrorCode.RadiusError.checkExpriedError);
            } else {
                throw e;
            }
        }

        let acctPacket: AccountingDocument = {
            action: 'accountingUpdate',
            usertoken: packet.attributes['User-Name'],
            userIp: packet.attributes['Framed-IP-Address'],
            nas_ip: packet.attributes['NAS-IP-Address'],
            protocol: packet.attributes['Framed-Protocol'],
            balanceType: packet.attributes['Platform-BalanceType'],
            expired: packet.attributes['Platform-Expired'],
            sessionId: packet.attributes['Acct-Session-Id'],
            sessionTime: packet.attributes['Acct-Session-Time'],
            baseTime: packet.attributes['Platform-BaseTime'],
            inputOctets: packet.attributes['Acct-Input-Octets'],
            outputOctets: packet.attributes['Acct-Output-Octets'],
            inputPackets: packet.attributes['Acct-Input-Packets'],
            outputPackets: packet.attributes['Acct-Output-Packets']
        };

        try {
            let isDeduct: boolean = await this.updateAcctPacketCache(acctPacket);
            if (isDeduct) {
                await this.sendAccounting(acctPacket);
            }
        } catch (e) {
            console.error(`账单更新或发送失败`);
            throw e;
        }

        return ret;
    }

    /**
     * 检查帐号的过期状态,如果过期则由radius-account将用户踢下线
     */
    private async checkExpiredStatus(packet: any, cache: any) {
        try {
            let [uid, source] = packet.attributes['User-Name'].split('|');
            let elapse = packet.attributes['Acct-Session-Time'] * 1000;
            console.log(`In cache Base time: ${cache['baseTime']}, Expired time: ${cache['expireTime']}. Elapse time: ${elapse}ms`);
            if (cache['baseTime'] + elapse >= cache['expireTime']) {
                console.log(`超出用户时长，需要重新获取信息，处理`);
                let lastInfo: any = await this.querylastRecharge(uid, cache['radiusToken']);
                if (lastInfo['data']['baseTime'] + elapse < lastInfo['data']['expireTime']) {
                    /* 更新缓存超时时间 */
                    await this.setNewAccounting(uid, source, {
                        balanceType: lastInfo['data']['balanceType'] || lastInfo['data']['expireType'],
                        expireTime: lastInfo['data']['expireTime'],
                        baseTime: lastInfo['data']['baseTime'],
                        radiusToken: cache.radiusToken
                    });
                } else {
                    throw errorFactory(ErrorCode.AccountError.expiredError);
                }
            }
        } catch (e) {
            throw e;
        }
    }

    /**
     * todo 实现 ,这里需要更新用户的cache
     * @param uid //用户id
     * @param source //用户的来源平台
     * @param lastInfo //用户新的扣费账单
     */
    private async setNewAccounting(uid: string, source: string, lastInfo: any) {
        console.log('更新用户的计费信息...');
        let key = uid + ':' + source;
        try {
            let data: any = {
                balanceType: lastInfo.balanceType,
                expireTime: lastInfo.expireTime,
                baseTime: lastInfo.baseTime,
                radiusToken: lastInfo.radiusToken
            };
            await this.updateCache(key, JSON.stringify(data));
            console.log(`更新成功`)
        } catch (e) {
            console.error(`更新用户计费信息失败`);
            throw e;
        }
    }

    /**
     * 从passport 获取最新的账户余额信息
     * @param uid
     */
    private async querylastRecharge(uid: string, radiusUserName: string): Promise<any> {
        console.log('查询最后的用户信息', radiusUserName, uid);
        let userLastInfo = await apiCaller.post(serverConfig.api.querylastRecharge, {
            token: radiusUserName
        });
        console.log('用户最后的信息是', userLastInfo);
        return userLastInfo
    }

    /**
     * 计费停止时
     * @param packet
     * @param rinfo
     */
    private async onAccountingStop(packet: any) {
        let [uid, source] = packet.attributes['User-Name'].split('|');
        let key = `${uid}|${packet.attributes['Acct-Session-Id']}`;
        await this.deleteAcctPacketCache(key);

        await this.sendAccounting({
            action: 'accountingStop',
            usertoken: packet.attributes['User-Name'],
            userIp: packet.attributes['Framed-IP-Address'],
            nas_ip: packet.attributes['NAS-IP-Address'],
            protocol: packet.attributes['Framed-Protocol'],
            balanceType: packet.attributes['Platform-BalanceType'],
            expired: packet.attributes['Platform-Expired'],
            sessionId: packet.attributes['Acct-Session-Id'],
            sessionTime: packet.attributes['Acct-Session-Time'],
            baseTime: packet.attributes['Platform-BaseTime'],
            inputOctets: packet.attributes['Acct-Input-Octets'],
            outputOctets: packet.attributes['Acct-Output-Octets'],
            inputPackets: packet.attributes['Acct-Input-Packets'],
            outputPackets: packet.attributes['Acct-Output-Packets']
        });

        let offlineInfo: OfflineParameter = {
            uid: uid,
            source: source,
            session: packet.attributes['Acct-Session-Id'],
            nas_ip: packet.attributes['NAS-IP-Address'],
        };

        this.offline(offlineInfo);
    }

    /**
     * 发送账单到redis队列
     */
    public async sendAccounting(data: AccountingDocument) {
        try {
            await this.enQueue(serverConfig.list['acctList'], JSON.stringify(data));
            console.log(`账单${data.sessionId}|${data.sessionTime}成功入队`);
        } catch (e) {
            console.error(`账单入队失败,稍后重试${e.toString()}`);
            setTimeout(async () => {
                await this.sendAccounting(data);
            }, serverConfig.list['timeOut']);
        }
    }
}

export {
    Accounting
}