#!/usr/bin/env sh
    if [ $# -eq 0 ]; then
        echo "Usage:\n\t $0 [options]"
        echo "options:\n\t [d/D] -> development(default)"
        echo "\t [t/T] -> test"
        echo "\t [s/S] -> stage"
        echo "\t [p/P] -> production"
        echo "\t [i/I] -> install package"
    fi

    isInstall=0
    export NODE_ENV=development
    while getopts "dDtTsSpPiI" arg
    do
      case $arg in
        d|D)
            export NODE_ENV=development
            ;;
        t|T)
            export NODE_ENV=test
            ;;
        s|S)
            export NODE_ENV=stage
            ;;
        p|P)
            export NODE_ENV=production
            ;;
        i|I)
            isInstall=1
            ;;
        ?)
            export NODE_ENV=development
            ;;
      esac
    done

    if [ -f pm2-$NODE_ENV.json ]; then
        echo "准备使用pm2 启动 pm2-$NODE_ENV.json"
    else
        echo "不存在pm2启动脚本[pm2-$NODE_ENV.json]，退出启动程序";
        exit;
    fi

    echo "是否继续(y/n)?"
    read input
    while test -z $input
      do
        read input
      done

    if [ $input != 'y' -a $input != 'Y' ];then
        exit;
    else
        if [ $isInstall -eq 1 ]; then
            cnpm install gulp -g
            cnpm install gulp-nodemon -g
            cnpm install
        fi

        gulp build
        pm2 delete platform-radius-$NODE_ENV
        pm2 start pm2-$NODE_ENV.json
    fi