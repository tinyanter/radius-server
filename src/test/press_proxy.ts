const radius = require("radius");
const dgram = require("dgram");
const http = require("http");
const url = require("url");
const qs = require("querystring");

class PressProxy {
    private ip: string;
    private port: number;
    private httpHandle: http.Server;
    private udpHandle: dgram.Socket;
    private static authPort: number = 1812;
    private static acctPort: number = 1813;
    private static secret: string = 'ooo';


    constructor(port: number, ip: string) {
        this.ip = ip;
        this.port = port;
    }

    init() {
        /*
         this.udpHandle = dgram.createSocket("udp4");
         this.udpHandle.on('message', async (msg: any, rinfo: any) => {
         try {
         let packet = radius.decode({packet: msg, secret: this.secret});
         await this.udpHook(packet, rinfo);
         } catch (e) {
         console.log("Failed to decode radius packet, silently dropping:", e);
         }
         });
         */

        this.httpHandle = http.createServer();
        this.httpHandle.on('request', (req, res) => {
            this.httpHook(req, res);
        });

        this.httpHandle.listen(this.port);
    }

    private httpHook(req: any, res: any) {

        let urlObj: any = url.parse(req.url);
        switch (urlObj.pathname) {
            case '/radius/auth':
                this.auth(req, res);
                break;
            case '/radius/account':
                this.acct(req, res);
                break;
            default:
                console.error(`路径[${urlObj.pathname}]不存在!`);
                res.statusCode = 400;
                res.end('Bad Request');
        }

    }

    private auth(req: any, res: any) {
        let query: any = url.parse(req.url, true).query;
        let user: string = `${query.uid}|pc`;
        let pwd: string = query.pwd;
        let reqData: any = radius.encode({
            code: "Access-Request",
            secret: PressProxy.secret,
            attributes: [
                ['NAS-IP-Address', '10.5.5.5'],
                ['User-Name', user],
                ['User-Password', pwd],
                ['NAS-Identifier', 'CDSXXX'],
            ]
        });

        let handle: any = dgram.createSocket("udp4");
        handle.on('message', (msg: any, rinfo: any) => {
            try {
                let packet = radius.decode({packet: msg, secret: PressProxy.secret});
                if ('Access-Accept' === packet.code) {
                    res.end('ok');
                } else {
                    console.log(packet);
                    res.statusCode = 203;
                    res.end('auth fail');
                }
            } catch (e) {
                console.log("Failed to decode radius packet, silently dropping:", e);
            }
        });

        handle.send(reqData, 0, reqData.length, PressProxy.authPort, this.ip, (err, bytes) => {
            if (err) {
                console.log('Error sending response to ');
            }
            console.log(`${reqData}|${PressProxy.authPort}|${this.ip}`);
            console.log(`Send success`);
        });
    }

    private acct(req: any, res: any) {

        let body: string = '';
        req.on('data', (data) => {
            body += data.toString();
        });

        req.on('end', ()=>{
            let param: any = qs.parse(body);
            console.log(param);
            let reqData: any = radius.encode({
                code: "Accounting-Request",
                secret: PressProxy.secret,
                attributes: [
                    ['Acct-Status-Type', param.type],
                    ['User-Name', param.user],
                    ['Acct-Session-Id', param.session],
                    ['NAS-IP-Address', param.nas_ip],
                    ['NAS-Identifier', 'CDSXXX'],
                    ['Acct-Session-Time', param.time],
                    ['Acct-Input-Octets', param.inOct],
                    ['Acct-Output-Octets', param.outOct],
                    ['Acct-Input-Packets', param.inPkg],
                    ['Acct-Output-Packets', param.outPkg]
                ]
            });

            let handle: any = dgram.createSocket("udp4");
            handle.on('message', (msg: any, rinfo: any) => {
                try {
                    let packet = radius.decode({packet: msg, secret: PressProxy.secret});
                    if ('Accounting-Response' === packet.code) {
                        res.end('ok');
                    } else {
                        console.log(packet);
                        res.statusCode = 203;
                        res.end('account fail');
                    }
                } catch (e) {
                    console.log("Failed to decode radius packet, silently dropping:", e);
                }
            });

            handle.send(reqData, 0, reqData.length, PressProxy.acctPort, this.ip, (err, bytes) => {
                if (err) {
                    console.log('Error sending response to ');
                }
                //console.log(`${reqData}|${PressProxy.acctPort}|${this.ip}`);
                console.log(`Send success`);
            });
        })


    }
}

let proxy: PressProxy = new PressProxy(8000, '39.106.146.46');
proxy.init();
