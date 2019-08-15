import { CoreConfig } from "../../core/core-config";
let logConfig = CoreConfig.getConfig('logconfig');
import * as request from "request"
let reportServer = logConfig['reportServer'];
class LogReport {
    public static report(error: string) {
        let title = `platform-radius [${CoreConfig.getEnvFromProcess()}]报错`;
        let message = error;
        request.post(
            {
                url: `${reportServer}/pushError`,
                form: {
                    errTitle: title,
                    errMsg: message
                }
            },
            function (err: any, response: any, body: any) {
                if (err || response.statusCode != 200) {
                    console.error(`报告错误发生了错误`, err||response.statusCode);
                    return;
                }
            });
    }
}
export {
    LogReport
}