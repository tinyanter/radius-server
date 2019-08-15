import * as https from 'https';
import * as URL from 'url';
import * as fs from 'fs';

export class ApiCaller {
    private ca: string;
    private key: string;
    private cert: string;
    private pfx: any;
    private passphrase: string;
    private reqHandle: any;
    public timeout: number;
    public responseKey = "errCode";

    constructor(ca: string, key: string, cert: string, timeout: number = 3000) {
        this.ca = fs.readFileSync(ca, 'utf-8');
        this.key = fs.readFileSync(key, 'utf-8');
        this.cert = fs.readFileSync(cert, 'utf-8');
        if (undefined !== timeout) {
            this.timeout = timeout;
        }
    }

    /*
     constructor(pfx: string, passphrase: string, timeout: number = 3000) {
     this.pfx = fs.readFileSync(pfx, 'binary');
     this.passphrase = passphrase;
     if (undefined !== timeout) {
     this.timeout = timeout;
     }
     }
     */
    public async get(url: string, data: string) {

    }

    public async post(url: string, data: any) {
        try {
            let reqData: string = JSON.stringify(data);
            let obj = URL.parse(url);
            let options: any = {
                timeout: this.timeout,
                protocol: obj.protocol,
                hostname: obj.hostname,
                port: obj.port,
                method: 'POST',
                path: obj.path,
                key: this.key,
                cert: this.cert,
                /*不验证服务端证书*/
                //ca: [this.ca],
                rejectUnauthorized: false,
                headers: {
                    'Content-Type': 'Application/json',
                    'Content-Length': reqData.length
                }
            };
            return await this.action(options, reqData);
        } catch (e) {
            throw e;
        }
    }

    private action(options: any, reqdata: string) {
        let self = this;
        return new Promise((resolve, reject) => {
            self.reqHandle = https.request(
                options,
                (res) => {
                    let data: string = '';
                    if (res.statusCode !== 200) {
                        reject(`网络访问发生了错误,返回的httpcode 为${res.statusCode}`);
                        return;
                    }
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        try {
                            let result: any = JSON.parse(data);
                            if (typeof result[self.responseKey] === "undefined" || result[self.responseKey] !== 0) {
                                reject(result['errMsg']);
                                return;
                            }
                            resolve(result);
                        } catch (e) {
                            reject(`目标地址返回的内容无法被json解析[${data}]`);
                            return;
                        }

                    });

                });

            self.reqHandle.on('error', (err: any) => {
                reject(`网络访问发生了错误${err.toString()}`);
                return;
            });

            self.reqHandle.write(reqdata);
        })
    }
}