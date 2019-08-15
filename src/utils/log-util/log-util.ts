import logSettings from './log-settings';
import * as fs from 'fs';
import { LogReport } from "./log-report";
let log4js = require('log4js');
log4js.configure(logSettings);

class LogUtil {
    private static errorLogger = log4js.getLogger('errorLogger');
    private static resLogger = log4js.getLogger('resLogger');
    private static consoleLogger = log4js.getLogger('consoleLogger');

    public console(info: any) {
        LogUtil.consoleLogger.info(info);
    }

    public logError(req: any, err: any, startTime: any) {
        let errorString = LogUtil.formatError(req, err, startTime);
        LogUtil.errorLogger.error(errorString);
        // if (err['report'] === true) {
            LogReport.report(errorString);
        // }
    }

    public logResponse(req: any, res: any, startTime: any) {
        LogUtil.resLogger.info(LogUtil.formatRes(req, res, startTime));
    }

    static initLogPath() {
        if (logSettings.baseLogPath) {
            LogUtil.confirmPath(logSettings.baseLogPath);
            for (let i of Object.keys(logSettings.appenders)) {
                if (logSettings.appenders[i].path) {
                    LogUtil.confirmPath(logSettings.baseLogPath + logSettings.appenders[i].path);
                }
            }
        }
    }

    private static confirmPath(pathStr: string) {
        if (!fs.existsSync(pathStr)) {
            fs.mkdirSync(pathStr);
            console.log('createPath: ' + pathStr);
        }
    }

    private static formatRes(req: any, res: any, startTime: any) {
        let logText: String = "";

        logText += "\n" + "*************** response log start ***************" + "\n";
        logText += <string>LogUtil.formatReqLog(req, startTime);
        logText += "response statusCode: " + res.statusCode + "\n";
        logText += "response result: " + "\n" + res.result + "\n";
        logText += "*************** response log end ***************" + "\n";

        return logText;

    }

    private static formatError(req: any, err: any, startTime: any) {
        let logText: string = "";

        logText += "\n" + "*************** error log start ***************" + "\n";
        logText += <string>LogUtil.formatReqLog(req, startTime);
        logText += "err message: " + JSON.stringify(err) + "\n";
        logText += "*************** error log end ***************" + "\n";

        return logText;
    };

    private static formatReqLog(req: any, startTime: any) {

        let logText: String = "";
        let method = req.method;

        logText += "request method: " + method + "\n";
        logText += "request originalUrl:  " + req.originalUrl + "\n";
        logText += "request client ip:  " + req.ip + "\n";

        if (method === 'GET') {
            logText += "request query:  " + JSON.stringify(req.query) + "\n";
        } else {
            logText += "request body: " + "\n" + JSON.stringify(req.body) + "\n";
        }
        let resTime = Date.now() - startTime;
        logText += "response time: " + resTime + "ms\n";

        return logText;
    }
}

export { LogUtil };