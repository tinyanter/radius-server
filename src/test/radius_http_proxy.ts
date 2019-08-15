import * as express from "express";
import * as bodyParser from 'body-parser';
const radius = require("radius");
const dgram = require("dgram");
const http = require("http");
const url = require("url");
const qs = require("querystring");
let option = {
    title: 'Express Status',  // Default title
    path: '/status',
    spans: [{
        interval: 1,            // Every second
        retention: 60           // Keep 60 datapoints in memory
    }, {
        interval: 5,            // Every 5 seconds
        retention: 60
    }, {
        interval: 15,           // Every 15 seconds
        retention: 60
    }],
    chartVisibility: {
        cpu: true,
        mem: true,
        load: true,
        responseTime: true,
        rps: true,
        statusCodes: true
    },
    ignoreStartsWith: '/admin'
}
const statusMonitor = require('express-status-monitor')(option);

class PressProxy {
    private ip: string;
    private static authPort: number = 1812;
    private static acctPort: number = 1813;
    private static secret: string = 'ooo';


    constructor(ip: string) {
        this.ip = ip;
    }

    auth(req: any, res: any) {
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
                handle.close();
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

    acct(req: any, res: any) {

        let body: string = '';
        req.on('data', (data) => {
            body += data.toString();
        });

        req.on('end', () => {
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

const app = express();
const ip = '192.168.59.74';
const proxy: PressProxy = new PressProxy(ip);
app.use(statusMonitor);

app.get('/radius/auth', (req, res) => {

    proxy.auth(req, res);
})

app.post('/radius/account', (req, res) => {

    proxy.acct(req, res);
})

app.use((err, req, res, next) => {

    res.statusCode = 404;
    res.end();
})

app.listen(8000, () => {
    console.log(`Radius http proxy listening on 8000`);
})


