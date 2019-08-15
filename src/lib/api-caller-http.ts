import * as request from "request"
import {ErrorCode, errorFactory} from './error-code';
const dnscache = require('dnscache')({"enable": true, "ttl": 300, "cachesize": 1000});

export class ApiCaller {
    public timeout: number = 3000;
    public responseKey = "errCode";
    private request: any;

    constructor(){
        this.request = request.defaults({lookup: dnscache.lookup, time: true});
    }

    public get(url: string) {
        let self = this;
        return new Promise((resolve, reject) => {
            this.request.get({
                url: url,
                timeout: this.timeout
            }, function (err: any, response: any, body: any) {
                if (err) {
                    reject(`网络访问发生了错误${err.toString()}`);
                    return;
                }
                console.log(`>>>${url} elapsed ${response.timingPhases.total.toFixed(2)} ms`);
                if (response.statusCode != 200) {
                    reject(`网络访问发生了错误,返回的httpcode 为${response.statusCode}`);
                    return;
                }
                try {
                    let responseData = (JSON.parse(body));
                    if (typeof responseData[self.responseKey] == "undefined" || responseData[self.responseKey] !== 0) {
                        reject(responseData['errMsg']);
                        return;
                    }
                    resolve(responseData)
                } catch (e) {
                    reject(`目标地址返回的内容无法被json解析[${body.toString()}]`);
                    return;
                }
            })
        })
    }

    public post(url: string, requestData: any) {
        let self = this;
        return new Promise((resolve, reject) => {
            this.request.post(
                {
                    url: url,
                    form: requestData
                },
                function (err: any, response: any, body: any) {
                    if (err) {
                        console.error(`${err}`);
                        reject(errorFactory(ErrorCode.RemoteCall.default));
                        return;
                    }
                    console.log(`>>>${url} elapsed ${response.timingPhases.total.toFixed(2)} ms`);
                    if (response.statusCode != 200) {
                        console.error(`接口[${url}]未正确返回， 返回码为:[${response.statusCode}]`);
                        reject(errorFactory(ErrorCode.RemoteCall.accessError));
                        return;
                    }
                    try {
                        let responseData: any = (JSON.parse(body));
                        if (typeof responseData[self.responseKey] == "undefined" || responseData[self.responseKey] !== 0) {
                            console.error(`接口[${url}]返回数据:[${body}]`);
                            console.dir(responseData, {showHidden: true, depth: null});
                            reject(responseData['errMsg']);
                            return;
                        }
                        resolve(responseData)
                    } catch (e) {
                        console.error(`目标地址返回的内容无法被json解析`);
                        throw errorFactory(ErrorCode.RemoteCall.errorData);
                    }
                })

        })
    }
}