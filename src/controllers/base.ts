import {CoreConfig} from "../core/core-config";
import {Jwt} from '../lib/token/jwt';
import {redisClient} from "../model/database/redis";
import {ErrorCode, errorFactory} from "../lib/error-code";
import {LogReport} from "../utils/log-util/log-report";


let serverConfig = CoreConfig.getConfig("server");
let jwt: Jwt = new Jwt(serverConfig['tokenSecret']);

class Base {
    /**
     * 验证token是否是有效的token
     * @param token
     */
    protected validationToken(token: string): boolean {
        try {
            if (jwt.verify(token) === true) {
                return true
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    protected makeToken(data: { uid: string, source: string }): any {
        return jwt.getToken(data);
    }

    protected decodeToken(token: string): any {
        try {
            let data = jwt.decode(token);
            let payloadString = data['payload'];
            let payload = JSON.parse(payloadString);
            return payload;
        } catch (e) {
            throw e;
        }
    }

    /**
     * 设置cache
     * @param key
     * @param data
     * @returns {Promise<void>}
     */
    protected async setCache(key: string, data: string) {
        console.log('设置用户cache', data);
        try {
            await redisClient.setAsync(key, data);
        } catch (e) {
            console.error(e);
            LogReport.report(`设置cache失败[${JSON.stringify(e)}]`);
            throw errorFactory(ErrorCode.RadiusError.createCacheError, `${key}`);
        }
    }

    /**
     * 更新cache
     * @param key
     * @param data
     * @returns {Promise<void>}
     */
    protected async updateCache(key: string, data: string) {
        try {
            await redisClient.getsetAsync(key, data);
        } catch (e) {
            console.error(e);
            LogReport.report(`更新cache失败[${JSON.stringify(e)}]`);
            throw errorFactory(ErrorCode.RadiusError.updateCacheError, `${key}`);
        }
    }

    /**
     * 获取cache
     * @param key
     * @returns {Promise<any>}
     */
    protected async getCache(key: string) {
        try {
            let result = await redisClient.getAsync(key);
            return result;

        } catch (e) {
            console.error(e);
            LogReport.report(`获取cache失败[${JSON.stringify(e)}]`);
            throw errorFactory(ErrorCode.RadiusError.getCacheError, `${key}`);
        }
    }

    /**
     * 删除cache
     * @param key
     * @returns {Promise<any>}
     */
    protected async delCache(key: string) {
        try {
            await redisClient.delAsync(key);
        } catch (e) {
            console.error(e);
            LogReport.report(`移除cache失败[${JSON.stringify(e)}]`);
            throw errorFactory(ErrorCode.RadiusError.deleteCacheError, `${key}`);
        }
    }

    /**
     * 消息入队
     * @param list
     * @param data
     * @returns {Promise<void>}
     */
    protected async enQueue(queue: string, data: string) {
        try {
            await redisClient.rpushAsync(queue, data);
        } catch (e) {
            console.error(e);
            LogReport.report(`消息入队失败[${JSON.stringify(e)}]`);
            throw errorFactory(ErrorCode.RadiusError.enQueueError, `${queue}`);
        }
    }

    /**
     * 消息出队
     * @param queue
     * @returns {Promise<void>}
     */
    protected async deQueue(queue: string) {
        try {
            await redisClient.lpopAsync(queue);
        } catch (e) {
            console.error(e);
            throw errorFactory(ErrorCode.RadiusError.deQueueError, `${queue}`);
        }
    }

    /**
     * 移除队列中值为value的元素
     * @param queue
     * @param value
     * @param count
     * @returns {Promise<void>}
     */
    protected async rmQueue(queue: string, value: string, count: number = 0) {
        try {
            await redisClient.lremAsync(queue, count, value);
        } catch (e) {
            console.error(e);
            LogReport.report(`移除消息失败[${JSON.stringify(e)}]`);
            throw errorFactory(ErrorCode.RadiusError.rmQueueError, `[${queue}|${value}|${count}`);
        }
    }

    protected async peekQueue(queue: string, index: number) {
        try {
            return await redisClient.lindexAsync(queue, index);
        } catch (e) {
            console.error(e);
            LogReport.report(`窥探失败[${JSON.stringify(e)}]`);
            throw errorFactory(ErrorCode.RadiusError.peekQueueError, `[${queue}|${index}`);
        }
    }
}

export {
    Base
}