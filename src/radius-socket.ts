import {BaseRadius} from "./core/base-radius";
import {UserOffLine} from "./interface/global";
import {LogReport} from "./utils/log-util/log-report";

const io = require('socket.io-client');

class RadiusSocket extends BaseRadius {
    //private udpHandle: dgram.Socket;
    private ip: string;
    private port: number;
    private url: string;
    private socket: any;

    constructor(ip: string, port: number) {
        super(0);
        this.ip = ip;
        this.port = port;
        this.url = `http://${ip}:${port}`;
    }

    run() {
        this.socket = io(this.url);
        this.socket.on('error', (error: any) => {
            LogReport.report(`连接radius-center出错${error}`);
            console.error(`连接radius-center出错${error}`);
        });

        /*监听用户下线通知*/
        this.socket.on('OFFLINE', async (data: any) => {
            console.log(`收到radius-center的下线通知${JSON.stringify(data)}`);
            let user: UserOffLine = {
                name: data['name'],
                session: data['session']
            };
            await this.disConnection(user, data.nas_ip);
            console.log(`用户下线成功`);
        });

        this.socket.on('connect', () => {
            this.socket.emit('register', 'Hello');
        });

        this.socket.on('connect_error', (error: any) => {
            LogReport.report(`连接radius-center出错${error}`);
            console.error(`In event connect_error, 连接radius-center出错稍后重连 ${error}`);
        });

        this.socket.on('disconnect', (resaon: any) => {
            console.error(`In event disconnect ${resaon}`);
        });
    }

    /*implement abstract interface*/
    protected hook(packet: any, info: any): any {

    }

    protected onRequest(packet: any, rinfo: any): any {

    }
}

export {
    RadiusSocket
}