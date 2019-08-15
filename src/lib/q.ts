import * as PouchDB from "pouchdb";
import * as fs from "fs";

class Q {
    private queDb: any;
    private indexFile: string;
    private curIndexFile: string;

    constructor(frontIndexFile: string, tailIndexFile: string, queuePath: string) {
        this.curIndexFile = frontIndexFile;
        this.indexFile = tailIndexFile;
        this.queDb = new PouchDB(queuePath);
    }

    private getIndex() {
        try {
            if (!fs.existsSync(this.indexFile)) {
                fs.writeFileSync(this.indexFile, "0", {encoding: 'utf-8'});
            }

            let indexContent = fs.readFileSync(this.indexFile, {encoding: "utf-8"});
            let index = parseInt(indexContent);
            return index;

        } catch (e) {
            throw "处理索引文件发生了问题，请退出进程";
        }

    }

    private incIndex() {
        try {
            if (!fs.existsSync(this.indexFile)) {
                fs.writeFileSync(this.indexFile, "0", {encoding: 'utf-8'});
            }

            let indexContent = fs.readFileSync(this.indexFile, {encoding: "utf-8"});
            let index = parseInt(indexContent);
            index = index + 1;
            fs.writeFileSync(this.indexFile, index.toString(), {encoding: "utf-8"});
            return index;

        } catch (e) {
            throw "++处理索引文件发生了问题，请退出进程";
        }
    }

    private getCurIndex() {
        try {
            if (!fs.existsSync(this.curIndexFile)) {
                fs.writeFileSync(this.curIndexFile, "0", {encoding: 'utf-8'});
            }
            let indexContent = fs.readFileSync(this.curIndexFile, {encoding: "utf-8"});
            let index = parseInt(indexContent);
            return index;

        } catch (e) {
            throw "处理索引文件发生了问题，请退出进程";
        }

    }

    private incCurIndex() {
        try {
            let indexContent = fs.readFileSync(this.curIndexFile, {encoding: "utf-8"});
            let index = parseInt(indexContent);
            index = index + 1;
            fs.writeFileSync(this.curIndexFile, index.toString(), {encoding: "utf-8"});
            return index;

        } catch (e) {
            throw "++处理Cur索引文件发生了问题，请退出进程";
        }
    }

    async peekQueue() {
        try {
            let curIndex = this.getCurIndex();
            console.log(`获取index${curIndex}`)
            let result = await this.queDb.get(curIndex.toString());
            return result.data;
        } catch (e) {
            if (e && e.status && e.status == 404) {
                return null;
            }
            console.log(`从队列获取数据发生了错误`, e.toString());
            throw e;
        }
    }

    async popQueue() {
        try {
            var sourceIndex = this.getCurIndex();
            let doc: any = await this.queDb.get(sourceIndex.toString());
            await this.queDb.remove(doc);
            return this.incCurIndex();
        } catch (e) {
            console.log(`修剪队列发生了错误${e.toString()},要删除的id是 ${sourceIndex}`)
        }
    }

    async pushQueue(data: any) {
        try {
            let maxIndex = this.getIndex();
            let cacheData = {
                _id: maxIndex.toString(),
                data: data
            };
            await this.queDb.put(cacheData);
            this.incIndex();
            return maxIndex;
        } catch (e) {
            throw `写入发生了错误${e.toString()}`
        }

    }
}
export {
    Q
}