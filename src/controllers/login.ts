import {CoreConfig} from "../core/core-config";
import {ApiCaller} from '../lib/api-caller-http';
import {LoginParameter, AuthParameter} from "../interface/login";
import {LogReport} from "../utils/log-util/log-report";
const PouchDB = require('pouchdb');
const serverConfig = CoreConfig.getConfig("server");

const pouchCfg = serverConfig["pouchDB"];
const db = new PouchDB(pouchCfg.path, {
    auth: {
        username: pouchCfg.user,
        password: pouchCfg.password
    }
});

let apiCaller: ApiCaller = new ApiCaller();
import {Base} from "./base";


class Login extends Base {
    private async remoteAuth(param: AuthParameter): Promise<boolean> {
        let authData: any = await apiCaller.post(`${serverConfig.radiusCenter.auth}`, {
            password: param.password,
            token: param.token,
            uid: param.uid,
            source: param.source,
            nas_ip: param.nas_ip
        });

        let {baseTime, expireTime, balanceType, expireType} = authData['data'];

        console.log(`Monthly payment: ${balanceType}  Base timestamp: ${baseTime} --- End timestamp: ${expireTime}`);

        if (baseTime >= expireTime) {
            console.error(`这个帐号已经过期，或者没有充值${param.uid}`);
            return false;
        }

        let data: any = {
            balanceType: balanceType || expireType,
            baseTime: baseTime,
            expireTime: expireTime,
            radiusToken: param.token
        };

        await this.setCache(`${param.uid}|${param.source}`, JSON.stringify(data));
        return true;
    }

    private async localAuth(param: AuthParameter): Promise<boolean> {
        let key: string = `${param.uid}`;
        try {

            let doc: any = await db.get(key);
            let data: any = {
                balanceType: doc.expireType,
                baseTime: doc.baseTime,
                expireTime: doc.expireTime,
                radiusToken: param.token
            };

            console.log(`Monthly payment: ${doc.expireType}  Base timestamp: ${doc.baseTime} --- End timestamp: ${doc.expireTime}`);

            if (doc.baseTime >= doc.expireTime) {
                console.error(`这个帐号已经过期，或者没有充值${param.uid} (本地认证)`);
                return false;
            }

            if (param.password === doc.md5Token ||
                param.password === doc.radiusToken.split('.')[2]
            ) {
                await this.setCache(`${param.uid}|${param.source}`, JSON.stringify(data));
                return true;
            } else {
                console.error(`本地密码失效[${param.uid}]!`);
                return false;
            }

        } catch (e) {
            console.error(`本地认证失败[user: ${param.uid}, error: ${JSON.stringify(e)}]}`);
            return false;
        }
    }

    public async userLogin(info: LoginParameter): Promise<boolean> {
        try {
            let [uid, source, password] = info.token.split("|");

            let selfToken = this.makeToken({
                uid: uid,
                source: source
            });

            if (16 > uid.length) {
                return false;
            }

            if (!this.validationToken(selfToken)) {
                throw "token 签发者不被信任";
            }
            /*
             let userLogin: any = await apiCaller.post(`${serverConfig.radiusCenter.auth}`, {
             password: password,
             token: selfToken,
             uid: uid,
             source: source,
             nas_ip: info.nas_ip
             });
             let {baseTime, expireTime, balanceType, expireType} = userLogin['data'];

             console.log(`Monthly payment: ${balanceType}  Base timestamp: ${baseTime} --- End timestamp: ${expireTime}`);

             if (baseTime >= expireTime) {
             console.error(`这个帐号已经过期，或者没有充值${uid}`);
             return false;
             }

             let data: any = {
             balanceType: balanceType || expireType,
             baseTime: baseTime,
             expireTime: expireTime,
             radiusToken: selfToken
             };

             await this.setCache(`${uid}|${source}`, JSON.stringify(data));
             */

            let data: AuthParameter = {
                password: password,
                token: selfToken,
                uid: uid,
                source: source,
                nas_ip: info.nas_ip
            };

            return await this.localAuth(data) || await this.remoteAuth(data);

        } catch (e) {
            //LogReport.report(`认证发生了错误[${JSON.stringify(e)}]`);
            console.error('认证发生了错误', JSON.stringify(e));
            return false;
        }
    }
}

export {
    Login
}