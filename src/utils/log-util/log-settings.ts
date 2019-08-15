import {CoreConfig} from "../../core/core-config";
let logConfig = CoreConfig.getConfig('logconfig');
let path = require('path');

var baseLogPath = path.resolve(__dirname, `../../${logConfig.logFileName}`);
if (logConfig.logFileName.substr(0, 1) == "/") {
    baseLogPath = path.resolve(logConfig.logFileName);
}

const errorLogPath = baseLogPath + logConfig.errorPath + "/" + logConfig.errorFileName;
const responseLogPath = baseLogPath + logConfig.responsePath + "/" + logConfig.responseFileName;

interface logInt {
    [propName: string]: any
}

let logSettings: logInt = {
    "appenders":
        {
            "errorLogger": {
                "category": "errorLogger",
                "type": "dateFile",
                "filename": errorLogPath,
                "alwaysIncludePattern": true,
                "pattern": logConfig.pattern,
                "path": logConfig.errorPath,
                "maxLogSize": logConfig.maxLogSize
            },
            "resLogger": {
                "category": "resLogger",
                "type": "dateFile",
                "filename": responseLogPath,
                "alwaysIncludePattern": true,
                "pattern": logConfig.pattern,
                "path": logConfig.responsePath,
                "maxLogSize": logConfig.maxLogSize
            },
            "consoleLogger": {
                "type": "console"
            }
        },
    "categories": {
        default: {appenders: ["consoleLogger"], level: 'all'},
        "errorLogger": {appenders: ["errorLogger"], level: 'error'},
        "resLogger": {appenders: ["resLogger"], level: 'debug'}
    },
    "baseLogPath": baseLogPath
};

export default logSettings;