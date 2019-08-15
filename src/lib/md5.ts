const crypto = require('crypto');

export class MD5 {
    static genMD5(data: string): string {
        let buff = new Buffer(data);
        return crypto.createHash('md5')
            .update(buff)
            .digest('hex')
            .toLowerCase();
    }
}
