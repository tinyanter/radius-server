interface AccountingDocument {
    action: string,// 记账的动作
    usertoken: string,//用户的token
    protocol: string,//认证的协议
    sessionId: string,//记账的会话id
    userIp: string,//用户的出口ip
    nas_ip: string, //pop节点的ip
    sourceData?: string, //原始的日志信息
    sessionTime: number,
    balanceType: number, //用户的账户类型
    expired: number,//用户的记账到期时间
    baseTime: number //用户登录时间
    inputOctets: number,
    outputOctets: number,
    inputPackets: number,
    outputPackets: number
}

interface UserOffLine {
    name: string,
    session: string
}


enum ActionList {
    Auth = 1,
    AccStart = 2,
    AccUpdate = 3,
    AccStop = 4,
}

export {
    AccountingDocument,
    UserOffLine
}