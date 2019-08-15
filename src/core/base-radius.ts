import * as radius from "radius";
import * as dgram from "dgram";
import {CoreConfig} from "./core-config";
import {UserOffLine} from "../interface/global"

const coreConfig = CoreConfig.getConfig("server");
const radiusCfg = coreConfig['radius'];
const NS_PER_SEC = 1e9;

abstract class BaseRadius {
    private udpHandle: dgram.Socket;
    private udpPort: number;
    private static coaPort: number = radiusCfg['port']['coaPort'];
    protected static secret: string = radiusCfg['secret'];

    constructor(port: number) {
        this.udpPort = port;
        this.udpHandle = dgram.createSocket("udp4");
    }

    private filter(addr: string) {
        let blankList: any = CoreConfig.getConfig("ipList");
        if (!blankList || -1 === blankList.indexOf(addr)) {
            return true;
        } else {
            return false;
        }
    }

    start(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.udpHandle.on('error', (err) => {
                console.error('Start server error:' + err);
                this.udpHandle.close();
                reject(err);
            });

            this.udpHandle.on('message', async (msg: any, rinfo: any) => {
                try {
                    const time = process.hrtime();
                    if (this.filter(rinfo.address)) {
                        console.log(`Filter ${rinfo.address}`);
                        return;
                    }
                    let packet = radius.decode({packet: msg, secret: BaseRadius.secret});
                    await this.hook(packet, rinfo);
                    const respTm = process.hrtime(time);
                    const elapse = (respTm[0] * NS_PER_SEC + respTm[1]) / 1000000;
                    console.log(`===RESPONSE:[code: %s user: %s <%s:%d> %d ms]===`,
                        'Access-Request' === packet.code ? packet.code : packet.attributes['Acct-Status-Type'],
                        packet.attributes['User-Name'], rinfo.address, rinfo.port, elapse.toFixed(3));
                } catch (e) {
                    console.log("Failed to decode radius packet, silently dropping:", e);
                }
            });

            this.udpHandle.on("listening", () => {
                const address = this.udpHandle.address();
                console.log("radius listening " +
                    address.address + ":" + address.port);
                resolve();
            });

            this.udpHandle.bind(this.udpPort);
        })
    }

    protected responsePacket(response: any, rinfo: any) {
        return new Promise((resolve, reject) => {
            console.log(`向套接字<${rinfo.address}:${rinfo.port}> 发送信息.`);
            this.udpHandle.send(response, 0, response.length, rinfo.port, rinfo.address, function (err: any, bytes: any) {
                if (err) {
                    console.log('Error sending response to ', rinfo);
                    console.dir(err.toString());
                    reject(err.toString());
                    return;
                }
                resolve(true)
            });
        })
    }

    protected async disConnection(user: UserOffLine, remoteAddress: string): Promise<any> {

        console.log(`将用户[${user.name}]踢下线`);
        let response = radius.encode({
            code: 'Disconnect-Request',
            secret: BaseRadius.secret,
            attributes: [
                ['User-Name', user.name],
                ['Acct-Session-Id', user.session]
            ]
        });

        try {
            await this.responsePacket(response, {address: remoteAddress, port: BaseRadius.coaPort});
        } catch (e) {
            console.dir(e, {showHidden: true, depth: null});
            console.log(`发送响应包发生了错误`);
        }
    }

    protected abstract hook(packet: any, info: any): any;

    protected abstract onRequest(packet: any, rinfo: any): any;
}

export {
    BaseRadius
}