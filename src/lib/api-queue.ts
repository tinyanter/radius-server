import * as PouchDB from "pouchdb";

interface INDEX {
    tailIndex: number,
    frontIndex: number
}

class BaseQueue {
    private idxDb: any;
    private queDb: any;

    constructor(indexPath: string, queuePath: string) {
        this.idxDb = new PouchDB(indexPath);
        this.queDb = new PouchDB(queuePath);
    }

    private async setIndexCache(data: INDEX) {
        try {
            let doc: any = {
                _id: 'INDEX',
                data: data
            };
            await this.idxDb.put(doc);
        } catch (e) {
            throw e;
        }
    }

    private async updateIndexCache(data: INDEX) {
        try {
            let doc: any = await this.idxDb.get('INDEX');
            let cacheData: any = {
                _id: 'INDEX',
                data: data
            };
            if (doc) {
                cacheData._rev = doc._rev;
            }
            await this.idxDb.put(cacheData);
        } catch (e) {
            throw e;
        }
    }

    async pushQueue(data: any) {
        try {
            let index: INDEX = await this.getIndex();
            //更新索引
            let indexData: INDEX = {
                tailIndex: index.tailIndex + 1,
                frontIndex: index.frontIndex
            };
            await this.updateIndexCache(indexData);

            //数据入队
            let cacheData = {
                _id: index.tailIndex.toString(),
                data: data
            };
            await this.queDb.put(cacheData);
        } catch (e) {
            throw e;
        }
    }

    async peekQueue() {
        try {
            let index: INDEX = await this.getIndex();
            if (index.frontIndex >= index.tailIndex) {
                return null;
            }
            let result = await this.queDb.get(index.frontIndex.toString());
            return result.data;
        } catch (e) {
            throw e;
        }
    }

    /**
     * 数据出队须在索引更新之后进行，否则当数据出队而索引未更新时，下次取数据会报错
     * @returns {Promise<void>}
     */
    async popQueue() {
        try {
            let index: INDEX = await this.getIndex();
            let indexData: INDEX = {
                tailIndex: index.tailIndex,
                frontIndex: index.frontIndex + 1
            };
            await this.updateIndexCache(indexData);

            let doc: any = await this.queDb.get(index.frontIndex.toString());
            await this.queDb.remove(doc);


        } catch (e) {
            throw e;
        }
    }

    async getIndex(): Promise<INDEX> {
        try {
            let doc = await this.idxDb.get('INDEX');
            return doc.data;
        } catch (e) {
            if (e.error && 404 === e.status) {
                await this.setIndexCache({tailIndex: 0, frontIndex: 0});
                return {tailIndex: 0, frontIndex: 0};
            } else {
                throw e;
            }
        }
    }
}

export {
    BaseQueue
}