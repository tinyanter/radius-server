var ErrorCode = {
    AccountError: {
        queryError: {
            code: 1001,
            report: true,
            message: "获取帐户信息失败"
        },
        expiredError: {
            code: 1002,
            report: false,
            message: "余额不足"
        }
    },
    RemoteCall: {
        default: {
            code: 5000,
            report: true,
            message: '网络连接发生了错误'
        },
        connectionError: {
            code: 5001,
            report: true,
            message: '网络连接发生了错误'
        },
        accessError: {
            code: 5002,
            report: true,
            message: '远程访问发生了错误'
        },
        errorData: {
            code: 5003,
            report: true,
            message: '远程数据格式不正确'
        }

    },
    SystemError: {
        checkError: {
            code: 6001,
            report: true,
            message: "系统检查发生了错误",
        }
    },
    RadiusError: {
        tokenError: {
            code: 4001,
            report: true,
            message: "提供的radius token 不合法"
        },
        checkExpriedError: {
            code: 4002,
            report: true,
            message: "检查用户过期状况出错"
        },
        getCacheError: {
            code: 4003,
            report: false,
            message: "获取用户缓存信息失败"
        },
        createCacheError: {
            code: 4004,
            report: true,
            message: "生成用户缓存信息失败"
        },
        updateCacheError: {
            code: 4005,
            report: true,
            message: "更新用户缓存信息失败"
        },
        deleteCacheError: {
            code: 4006,
            report: true,
            message: "删除用户缓存信息失败"
        },
        enQueueError: {
            code: 4007,
            report: true,
            message: "账单压入队列失败"
        },
        deQueueError: {
            code: 4008,
            report: true,
            message: "账单弹出队列失败"
        },
        rmQueueError: {
            code: 4009,
            report: true,
            message: "移除队列中指定元素失败"
        },
        peekQueueError: {
            code: 4010,
            report: true,
            message: "查看队列中元素失败"
        }
    }

}

function errorFactory(errorData: any, msg: any = "") {
    if (msg.code && msg.message) {
        return msg;
    }
    let error = {
        code: errorData.code,
        report: errorData.report,
        message: `${errorData.message}`
    }
    if (msg !== "") {
        error.message = `${errorData.message} [${msg.toString()}] `
    }

    return error
}

export {
    ErrorCode,
    errorFactory
}
