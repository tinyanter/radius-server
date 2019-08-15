const request = require('request');
const mt = require('moment');
const {spawn} = require('child_process');
const timeout = 1000;
const ipList = [
    '47.95.44.91',
    '10.1.1.96', //广东radius
    '10.1.1.97', //广东radius
];


function pushError(errTitle, errMsg) {
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

function pingHost(ip, interval) {
    let handle = spawn('ping', [`-i ${interval}`, ip]);

    handle.stdout.on('data', (data) => {
        let outPut = data.toString();
        let tmp = outPut.replace(/=/g, ' ').split(' ');
        let elapsed = tmp[tmp.length - 2];
        let tm = parseInt(elapsed);
        if (!isNaN(tm)) {
            console.log(`${mt().format('YYYY-MM-DD HH:mm:ss')} ${ip} : Alive (ms= ${elapsed})`);
            if (tm >= timeout) {
                pushError(`ping 检测超时`, `${ip} ${tm} ms`)
            }
        } else {
            console.error(`<${ip}> ${outPut}`);
            pushError(`ping 检测出错`, `<${ip}> ${outPut}`);
        }

    });
    handle.stderr.on('data', (data) => {
        console.error(`<${ip}> ${data.toString()}`);
        pushError(`ping 检测出错`, `<${ip}> ${data.toString()}`);
    });
}

function main() {
    for (let i = 0; i < ipList.length; i++) {
        pingHost(ipList[i], 5);
    }
}

main();
