import * as radius from "radius";
import {BaseRadius} from "./core/base-radius";
import {Login} from "./controllers/login";
import {CoreConfig} from "./core/core-config";
import {LoginParameter} from "./interface/login";

const config = CoreConfig.getConfig("server");
const unlimitedRateList = config['unlimitedRateList'];
const loginControllers: Login = new Login();

class RadiusAuth extends BaseRadius {
    constructor(port: number) {
        super(port);
    }

    protected async hook(packet: any, info: any): Promise<any> {
        console.log('==[Received from <%s:%d>{code:%s, user:%s, pwd:%s, nas_ip:%s, nas_id:%s}]==',
            info.address, info.port,
            packet.code, packet.attributes['User-Name'], packet.attributes['User-Password'],
            packet.attributes['NAS-IP-Address'], packet.attributes['NAS-Identifier']);

        switch (packet.code) {
            case 'Access-Request':
                await this.onRequest(packet, info);
                break;
            case 'Disconnect-ACK':
                break;
            case 'Disconnect-NAK':
                console.error(`用户下线失败`);
                break;
            default:
                throw `请求类型无法识别[${packet.code}][${config['radius']['port']['authPort']}]`;
        }
    }

    protected async onRequest(packet: any, rinfo: any): Promise<any> {
        let code = 'Access-Accept';
        let userName = packet.attributes['User-Name'];
        let passWord = packet.attributes['User-Password'];
        let loginInfo: LoginParameter = {
            token: userName + "|" + passWord,
            nas_ip: packet.attributes['NAS-IP-Address'],
        };

        let login = await loginControllers.userLogin(loginInfo);
        if (!login) {
            code = 'Access-Reject'
        }

        let response: any;

        if (-1 !== unlimitedRateList.indexOf(packet.attributes['User-Name'])) {
            response = radius.encode_response({
                packet: packet,
                code: code,
                secret: BaseRadius.secret,
                attributes: [
                    ['Reply-Message', `Hello`],
                    ['Acct-Interim-Interval', config['acctInterval']],
                ]
            });
        } else {
            response = radius.encode_response({
                packet: packet,
                code: code,
                secret: BaseRadius.secret,
                attributes: [
                    ['Reply-Message', `Hello`],
                    ['Acct-Interim-Interval', config['acctInterval']],
                    ['Vendor-Specific', 'Mikrotik', [['Mikrotik-Rate-Limit', config['limitRate']['cds']]]]
                ]
            });
        }

        /*
        if (来源于APPEX) {
            response = radius.encode_response({
                packet: packet,
                code: code,
                secret: BaseRadius.secret,
                attributes: [
                    ['Reply-Message', `Hello`],
                    ['Acct-Interim-Interval', config['acctInterval']],
                    ['Vendor-Specific', 'ADSL-Forum', [['Maximum-Data-Rate-Upstream', config['limitRate']['appexUpstream']]]],
                    ['Vendor-Specific', 'ADSL-Forum', [['Maximum-Data-Rate-Downstream', config['limitRate']['appexDownstream']]]]
                ]
            });
        }
        */


        try {
            await this.responsePacket(response, rinfo);
        } catch (e) {
            console.log(`发送响应包发生了错误`);
        }
    }
}

export {
    RadiusAuth
}