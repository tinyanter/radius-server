interface LoginParameter {
    token: string,
    nas_ip: string,
}

interface OnlineParameter {
    uid: string,
    source: string,
    session: string,
    nas_ip: string
}

interface OfflineParameter {
    uid: string,
    source: string,
    session: string,
    nas_ip: string
}

interface AuthParameter {
    password: string,
    token: string,
    uid: string,
    source: string,
    nas_ip: string
}

export {
    LoginParameter,
    OnlineParameter,
    OfflineParameter,
    AuthParameter
}