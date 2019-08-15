let request = require("request");
var Promise = require("bluebird");
let radius = require("radius");
let dgram = require("dgram");
let user = "18688998235";
let pass = 'q123456'
let reportTime = 300; //超过这个值 就报警
var ping = require("net-ping");
let sessionId = 0;
function getPingSessioinId() {
    sessionId = sessionId + 1;
    if (sessionId >= 65535) {
        sessionId = 1;
        return sessionId;
    }
    return sessionId;
}

let platformUrl = "http://47.95.44.91:21002"
let radiusList = [
    '10.1.1.49',
    '10.1.1.50',
    '10.1.1.96', 
    '10.1.1.97', 
    '10.1.1.34',
    '10.1.1.35'
];
checkInterval = 1000 * 30; //每一轮的时间
nextRadiusInterval = 1000; //radius服务器之间的检查间隔

let accPort = 1813;
let authPort = 1812;
let radiusSecret = "ooo"

class RunTime {
    constructor() {
        this.labelList = new Map();
    }
    pushError(errTitle, errMsg) {
        request({
            method: "POST",
            url: "https://oapi.dingtalk.com/robot/send?access_token=cbeaa4b7802dade1b861dfe2a0213f96f9a2c02a748a5cae9a5797db59060b30",
            json: true,
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
            },
            body: {
                "msgtype": "text",
                "text": {
                    "content": `${errTitle}\r\n${errMsg}`
                }
            }
        }, (err, response, body) => {
            if (err) {
                console.log('发送消息发生了错误');
            }
        })
    }
    start(label) {
        this.labelList.set(label, new Date().getTime())
    }
    end(label, info = '') {
        let preTime = this.labelList.get(label)
        if (!preTime) {
            throw `没有找到这个label`
        }
        this.labelList.delete(label)
        let nowTime = new Date().getTime();
        let runtimer = nowTime - preTime;

        let msg = `${new Date().toString()}  ${label} - ${info} - ${runtimer}ms`
        if (runtimer >= reportTime) {
            console.log('alert')
            this.pushError("radius响应时间告警", msg)
        }
        return msg;
    }
}

var runTime = new RunTime();
runTime.labelList = new Map()
class RadiusMonit {
    async monitService() {//检查平台服务时间
        return new Promise((resolve, reject) => {
            request.get({
                url: platformUrl + "/monitor/outerCheck"
            }, (err, response, body) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(true)
            })
        }).timeout(1000 * 10)
    }
    async loginPlatform() {
        return new Promise((resolve, reject) => {
            request.post({
                timeout: 1000 * 10,
                url: platformUrl + "/account/login",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "appName": "app",
                    "os": "andirod",
                    "appVer": "1000",
                    "source": "pc",
                    "serialNumber": "20999444"
                },
                form: {
                    phoneNumber: user,
                    password: pass

                }
            }, (err, response, body) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!body) {
                    reject("body 是空的，登录失败")
                    return;
                }
                try {
                    let data = JSON.parse(body);
                    if (data['errCode'] == null || data['errCode'] != 0) {
                        reject(`系统访问发生了错误${body}`)
                        return;
                    }
                    resolve(data['data']);
                } catch (e) {
                    reject(`内容不能解析${body}`)
                }
            })
        })
    }
    constructor() {
        this.startCheck();

    }
    async logErr(err) {

    }
    async sendError() {

    }

    async loginRadius(radiusIp, userName, passWord) {
        return new Promise((resolve, reject) => {
            let requestData = radius.encode({
                code: "Access-Request",
                secret: radiusSecret,
                attributes: [
                    ['NAS-IP-Address', '10.5.5.5'],
                    ['User-Name', userName],
                    ['User-Password', passWord],
                    ['NAS-Identifier', 'CDSXXX'],
                ]
            });
            let udpSocket = dgram.createSocket("udp4");
            udpSocket.on("message", (msg, rinfo) => {
                console.log(rinfo)
                try {

                    let packet = radius.decode({ packet: msg, secret: radiusSecret });

                    if ('Access-Accept' === packet.code) {
                        resolve(true);
                        return;
                    }
                    reject(`认证发生了错误`)

                } catch (e) {
                    console.log("Failed to decode radius packet, silently dropping:", e);
                    reject(`解开数据包发生了错误`)
                }
            })
            console.log(`send access request packet`)
            udpSocket.send(requestData, 0, requestData.length, authPort, radiusIp, (err, bytes) => {
                if (err) {
                    this.logErr(`向radius发送access request 发生了错误${err.toString()}`)

                    return;
                }
            })
        }).timeout(5000)
    }
    async accStartRadius(radiusIp, userName) {
        return new Promise((resolve, reject) => {
            let startRequest = radius.encode({
                code: "Accounting-Request",
                secret: radiusSecret,
                attributes: [
                    ['Acct-Status-Type', 'Start'],
                    ['User-Name', userName],
                    ['Acct-Session-Id', 'test1001'],
                    ['NAS-IP-Address', '192.168.0.1'],
                    ['NAS-Identifier', 'CDSXXX'],
                    ['Acct-Session-Time', 0],
                    ['Acct-Input-Octets', 0],
                    ['Acct-Output-Octets', 0],
                    ['Acct-Input-Packets', 0],
                    ['Acct-Output-Packets', 0]
                ]
            });
            let udpSocket = dgram.createSocket("udp4");
            udpSocket.on("message", (msg, rinfo) => {
                console.log(rinfo)
                try {
                    let packet = radius.decode({ packet: msg, secret: radiusSecret });

                    if ('Accounting-Response' === packet.code) {
                        resolve(true);
                        return;
                    }
                    reject(`发送accstart 发生了错误`)

                } catch (e) {
                    console.log("Failed to decode radius packet, silently dropping:", e);
                    reject(`解开数据包发生了错误`)
                }
            })
            console.log(`send accStart packet`)
            udpSocket.send(startRequest, 0, startRequest.length, accPort, radiusIp, (err, bytes) => {
                if (err) {
                    this.logErr(`向radius发送acc start 发生了错误${err.toString()}`)
                    reject(`向radius发送acc start 发生了错误${err.toString()}`)
                    return;
                }
            })
        }).timeout(5000)


    }
    async accUpdateRadius(radiusIp, userName) {
        return new Promise((resolve, reject) => {
            let updateRequest = radius.encode({
                code: "Accounting-Request",
                secret: radiusSecret,
                attributes: [
                    ['Acct-Status-Type', 'Interim-Update'],
                    ['User-Name', userName],
                    ['Acct-Session-Id', 'test1001'],
                    ['NAS-IP-Address', '192.168.0.1'],
                    ['NAS-Identifier', 'CDSXXX'],
                    ['Acct-Session-Time', 0],
                    ['Acct-Input-Octets', 0],
                    ['Acct-Output-Octets', 0],
                    ['Acct-Input-Packets', 0],
                    ['Acct-Output-Packets', 0]
                ]
            });
            let udpSocket = dgram.createSocket("udp4");
            udpSocket.on("message", (msg, rinfo) => {
                console.log(rinfo)
                try {
                    let packet = radius.decode({ packet: msg, secret: radiusSecret });

                    if ('Accounting-Response' === packet.code) {
                        resolve(true);
                        return;
                    }
                    reject(`发送acc update 发生了错误`)

                } catch (e) {
                    console.log("Failed to decode radius packet, silently dropping:", e);
                    reject(`解开数据包发生了错误`)
                }
            })
            console.log(`send accessUpdate packet`)
            udpSocket.send(updateRequest, 0, updateRequest.length, accPort, radiusIp, (err, bytes) => {
                if (err) {
                    this.logErr(`向radius发送acc update 发生了错误${err.toString()}`)
                    reject(`向radius发送acc update 发生了错误${err.toString()}`)
                    return;
                }
            })
        }).timeout(5000)

    }
    async accStopRadius(radiusIp, userName) {
        return new Promise((resolve, reject) => {
            let stopRequest = radius.encode({
                code: "Accounting-Request",
                secret: radiusSecret,
                attributes: [
                    ['Acct-Status-Type', 'Stop'],
                    ['User-Name', userName],
                    ['Acct-Session-Id', 'test1001'],
                    ['NAS-IP-Address', '192.168.0.1'],
                    ['NAS-Identifier', 'CDSXXX'],
                    ['Acct-Session-Time', 0],
                    ['Acct-Input-Octets', 0],
                    ['Acct-Output-Octets', 0],
                    ['Acct-Input-Packets', 0],
                    ['Acct-Output-Packets', 0]
                ]
            });
            let udpSocket = dgram.createSocket("udp4");
            udpSocket.on("message", (msg, rinfo) => {
                console.log(rinfo)
                try {
                    let packet = radius.decode({ packet: msg, secret: radiusSecret });

                    if ('Accounting-Response' === packet.code) {
                        resolve(true);
                        return;
                    }
                    reject(`发送acc stop 发生了错误`)

                } catch (e) {
                    console.log("Failed to decode radius packet, silently dropping:", e);
                    reject(`解开数据包发生了错误`)
                }
            })
            console.log(`send accStop packet`)
            udpSocket.send(stopRequest, 0, stopRequest.length, accPort, radiusIp, (err, bytes) => {
                if (err) {
                    this.logErr(`向radius发送acc stop 发生了错误${err.toString()}`)
                    reject(`向radius发送acc stop 发生了错误${err.toString()}`)
                    return;
                }
            })
        }).timeout(5000)

    }
    async sleep(time, message) {
        console.log(message)
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(true)
            }, time)
        })
    }
    /**
     * 开始检查
     */
    async startCheck() {
        var checkAction = "athena"
        var servicems = 0;

        try {
            checkAction = "platform"
            runTime.start("loginPlatform")

            var userInfo = await this.loginPlatform()
            console.log(runTime.end("loginPlatform", 'http://platform'));
        } catch (e) {
            console.error(`登录平台发生了错误${e.toString()}`);
            console.log(`${checkInterval / 1000} 秒 后检查下一轮`)
            setTimeout(() => {
                this.startCheck();
            }, checkInterval)
            return;
        }

        let radiusUser = userInfo['radius_user'];
        let radiusPass = userInfo['radius_pass'];

        for (let i = 0; i < radiusList.length; i++) {
            try {
                let radiusIp = radiusList[i];

                checkAction = "athena"
                runTime.start("athena")
                await this.monitService();
                console.log(runTime.end("athena", 'http://athena'));



                checkAction = "登录";
                runTime.start("radiusLogin")
                await this.loginRadius(radiusIp, radiusUser, radiusPass)
                console.log(runTime.end("radiusLogin", `[${radiusIp} ]`));

                checkAction = "记账开始";
                runTime.start('radiusAccStart')
                await this.accStartRadius(radiusIp, radiusUser)
                console.log(runTime.end('radiusAccStart', `[${radiusIp} ]`));


                checkAction = "更新记账";
                runTime.start('radiusAccUpdate')
                await this.accUpdateRadius(radiusIp, radiusUser)
                console.log(runTime.end('radiusAccUpdate', `[${radiusIp}]`));

                checkAction = "用户下线";
                runTime.start('radiusAccStop')
                await this.accStopRadius(radiusIp, radiusUser)
                console.log(runTime.end('radiusAccStop', `[${radiusIp} ]`));

            } catch (e) {
                var errMsg = `检查${radiusList[i]}时，检查动作:${checkAction}),发生了错误${e.toString()}`
                runTime.pushError('radius响应时间告警', errMsg)
                console.log(errMsg);
            }
            if (i < radiusList.length - 1) {
                await this.sleep(nextRadiusInterval, `${nextRadiusInterval / 1000}秒后检查下一台radius`)
            }

        }
        console.log(`${checkInterval / 1000} 秒 后检查下一轮`)
        setTimeout(() => {
            this.startCheck();
        }, checkInterval)

    }
}
var radiusMonit = new RadiusMonit();