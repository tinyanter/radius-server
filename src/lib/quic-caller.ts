/**
 * Created by zhanghf on 2018/6/6.
 */
const {URL} = require('url');
const {Client} = require('quic/dist');

export class QuicCaller {
    static async post(url: string, data: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            let myURL = new URL(url);
            let host: string = myURL.hostname;
            let port: number = +myURL.port;
            let chunk: string = '';
            let handle = new Client();
            await handle.connect(port, host);
            handle.on('error', (err: any) => {
                reject(`客户端出错[${JSON.stringify(err)}]`);
            }).on('timeout', (err: any) => {
                reject(`服务端超时[${JSON.stringify(err)}]`);
            })
            let stream = handle.request();

            stream.on('error', (err: any) => {
                handle.close();
                reject(`请求端流出现错误[${JSON.stringify(err)}]`);
            }).on('data', (data: any) => {
                chunk += data;
            }).on('end', () => {
                handle.close();
                try {
                    let data = JSON.parse(chunk);
                    resolve(data);
                } catch (e) {
                    console.error(`接口${url}返回数据[${chunk}格式不正确`);
                    reject(e)
                }
            }).on('timeout', () => {
                console.log(`流请求超时`);
            });

            stream.end(data);
        });
    }
}