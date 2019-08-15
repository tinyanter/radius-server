var jws = require("jws");

export class Jwt {
    private secret = "JJPASSPORTBOOST"
    private header: any = {alg: 'HS256', 'typ': 'JWT'}
    private payload: any = null;

    public constructor(secret: string) {
        this.secret = secret;
    }

    public getToken(payload: any) {
        this.payload = payload
        const signature = jws.sign({
            header: {alg: 'HS256'},
            payload: this.payload,
            secret: this.secret
        });
        return signature;
    }


    public verify(token: string): boolean {
        let tokenInfo = jws.decode(token)
        return jws.verify(token, tokenInfo['header']['alg'], this.secret)
    }

    public decode(token: any): any {
        let tokenInfo = jws.decode(token)
        return tokenInfo;
    }
}