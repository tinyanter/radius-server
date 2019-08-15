import * as radius from "radius";
import {BaseRadius} from "./core/base-radius";
import {Accounting} from "./controllers/accounting";
import {UserOffLine} from "./interface/global";
import {CoreConfig} from "./core/core-config";
import {ErrorCode} from './lib/error-code';

const config = CoreConfig.getConfig("server").radius;

class RadiusAccount extends BaseRadius {
    private account: Accounting;

    constructor(port: number) {
        super(port);
        this.account = new Accounting();
    }

    protected async hook(packet: any, info: any): Promise<any> {
        console.log('==[Received from <%s:%d>{code:%s, user:%s, session:%s, nas_ip:%s, nas_id:%s, acct_session_time:%d, acct_input_octets:%d,' +
            'acct_output_octets:%d, acct_input_packets:%d, acct_output_packets:%d, acct_delay_time:%d}]==',
            info.address, info.port,
            packet.attributes['Acct-Status-Type'], packet.attributes['User-Name'], packet.attributes['Acct-Session-Id'],
            packet.attributes['NAS-IP-Address'], packet.attributes['NAS-Identifier'],
            packet.attributes['Acct-Session-Time'] || 0, packet.attributes['Acct-Input-Octets'] || 0,
            packet.attributes['Acct-Output-Octets'] || 0, packet.attributes['Acct-Input-Packets'] || 0,
            packet.attributes['Acct-Output-Packets'] || 0, packet.attributes['Acct-Delay-Time'] || 0);

        switch (packet.code) {
            case 'Accounting-Request':
                await this.onRequest(packet, info);
                break;
            case 'Disconnect-ACK':
                break;
            case 'Disconnect-NAK':
                console.error(`用户下线失败`);
                break;
            default:
                throw `请求类型无法识别[${packet.code}][${config['port']['accPort']}]`;
        }
    }

    protected async onRequest(packet: any, rinfo: any) {
        let logout: boolean = false;
        try {
            await this.account.onAccountingRequest(packet);
        }
        catch (e) {
            if (e.code === ErrorCode.AccountError.expiredError.code) {
                logout = true;
            }
            console.dir(e, {showHidden: true, depth: null});
            console.error('处理AccountRequest包发生了错误，忽略该包!', JSON.stringify(e));
        }

        /*用户过期,将用户踢下线*/
        if (logout) {
            let user: UserOffLine = {
                name: packet['attributes']['User-Name'],
                session: packet['attributes']['Acct-Session-Id']
            };

            await this.disConnection(user, rinfo.address);
        }

        /*向NAS发送响应*/
        let code = 'Accounting-Response';
        let response = radius.encode_response({
            packet: packet,
            code: code,
            secret: BaseRadius.secret,
            attributes: {'Reply-Message': `started,${packet.attributes['User-Name']}`}
        });
        try {
            await this.responsePacket(response, rinfo);
        } catch (e) {
            console.log(`发送响应包发生了错误`);
        }
    }
}

export {
    RadiusAccount
}