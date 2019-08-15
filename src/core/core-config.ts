import * as path from "path";
import * as fs from "fs";
import * as net from "net";

class CoreConfig {
    private static configList: any = [];
    private static loadedConfig: boolean = false;
    private static ipListPath: string = null;

    constructor() {
        CoreConfig.init();
    }

    public static init(path: string = "/etc/boost_ip.list") {
        let env = CoreConfig.getEnvFromProcess();
        if (!env) {
            throw "环境变量获取失败";
        }
        CoreConfig.ipListPath = path;
        CoreConfig.loadIpList(env);
        CoreConfig.watchIpConfig(env);
        CoreConfig.loadConfig(env)
    }

    public static getEnvFromProcess() {
        return process.env['NODE_ENV'];
    }

    private static ipVerify(list: string[]) {
        for (let i = 0; i < list.length; i++) {
            if (!net.isIPv4(list[i])) {
                throw `IP: [${list[i]}] is invalid.`;
            }
        }
        return true;
    }

    private static loadIpList(env: string): boolean {
        let preLoad: any;
        try {
            let content: string = fs.readFileSync(CoreConfig.ipListPath, {encoding: 'utf-8'});
            preLoad = JSON.parse(content);
            if (preLoad[env] && 0 < preLoad[env].length) {
                CoreConfig.ipVerify(preLoad[env]);
                CoreConfig.configList['ipList'] = preLoad[env];
            } else {
                throw `${env}属性不存在`;
            }
        } catch (e) {
            console.error(`文件[${CoreConfig.ipListPath}]不存在或格式有误,请检查 Error:<${e.toString()}>`);
            return false;
        }
        return true;
    }

    private static watchIpConfig(env: string) {
        fs.watchFile(CoreConfig.ipListPath, () => {
            if (CoreConfig.loadIpList(env)) {
                console.log(`配置文件${CoreConfig.ipListPath}更改生效!`);
            }
        })
    }

    private static loadConfig(env: string) {
        switch (env) {
            case "development":
                CoreConfig.loadDevConfig();
                CoreConfig.loadedConfig = true;
                break;
            case "test":
                CoreConfig.loadTestConfig();
                CoreConfig.loadedConfig = true;
                break;
            case "stage":
                CoreConfig.loadStageConfig();
                CoreConfig.loadedConfig = true;
                break;
            case "production":
                CoreConfig.loadProductionConfig();
                CoreConfig.loadedConfig = true;
                break;

            default:
                throw "没有找到环境变量,或者环境变量不是可以接受的值"
        }

    }

    private static loadDevConfig() {
        let configPath = path.join(__dirname, "../", "config", "development")
        let fileList = fs.readdirSync(configPath)
        for (let item in fileList) {
            let fileStat = fs.statSync(path.join(configPath, fileList[item]))
            if (fileStat.isDirectory()) {
                continue
            }
            let content: string = fs.readFileSync(path.join(configPath, fileList[item]), {encoding: 'utf-8'})
            let baseName = path.parse(fileList[item])
            try {
                CoreConfig.configList[baseName.name] = JSON.parse(content)
            }
            catch (e) {
                console.log(`${path.join(configPath, fileList[item])}，解析失败请检查格式${e.toString()}`)
            }
        }
    }

    private static loadStageConfig() {
        let configPath = path.join(__dirname, "../", "config", "stage")
        let fileList = fs.readdirSync(configPath)
        for (let item in fileList) {
            let fileStat = fs.statSync(path.join(configPath, fileList[item]))
            if (fileStat.isDirectory()) {
                continue
            }
            let content: string = fs.readFileSync(path.join(configPath, fileList[item]), {encoding: 'utf-8'})
            let baseName = path.parse(fileList[item])
            try {
                CoreConfig.configList[baseName.name] = JSON.parse(content)
            }
            catch (e) {
                console.log(`${path.join(configPath, fileList[item])}，解析失败请检查格式${e.toString()}`)
            }
        }
    }

    private static loadProductionConfig() {
        let configPath = path.join(__dirname, "../", "config", "production")
        let fileList = fs.readdirSync(configPath)
        for (let item in fileList) {
            let fileStat = fs.statSync(path.join(configPath, fileList[item]))
            if (fileStat.isDirectory()) {
                continue
            }
            let content: string = fs.readFileSync(path.join(configPath, fileList[item]), {encoding: 'utf-8'})
            let baseName = path.parse(fileList[item])
            try {
                CoreConfig.configList[baseName.name] = JSON.parse(content)
            }
            catch (e) {
                console.log(`${path.join(configPath, fileList[item])}，解析失败请检查格式${e.toString()}`)
            }
        }
    }

    private static loadTestConfig() {
        let configPath = path.join(__dirname, "../", "config", "test")
        let fileList = fs.readdirSync(configPath)
        for (let item in fileList) {
            let fileStat = fs.statSync(path.join(configPath, fileList[item]))
            if (fileStat.isDirectory()) {
                continue
            }
            let content: string = fs.readFileSync(path.join(configPath, fileList[item]), {encoding: 'utf-8'})
            let baseName = path.parse(fileList[item])
            try {
                CoreConfig.configList[baseName.name] = JSON.parse(content)
            }
            catch (e) {
                console.log(`${path.join(configPath, fileList[item])}，解析失败请检查格式${e.toString()}`)
            }
        }
    }

    public static getConfig(key: any = null) {
        if (CoreConfig.loadedConfig === false) {
            CoreConfig.init();
        }
        if (key) {
            return CoreConfig.configList[key]
        }
        return CoreConfig.configList
    }
}

export {
    CoreConfig
}
