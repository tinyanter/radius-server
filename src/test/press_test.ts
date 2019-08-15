const radius = require("radius");
const dgram = require("dgram");


class RadiusTest {
    private loginList: any = [];
    private secret: string;
    private count: number;
    private loop: number;

    constructor(secret: string, loop: number) {
        this.secret = secret;
        this.loop = loop;
        this.count = 0;
    }

    private auth() {
        for (let i = 0; i < this.loop; i++) {
            this.loginList.push(new Promise((resolve, reject) => {
                console.time(`send${i}`);
                var response = radius.encode({
                    code: "Access-Request",
                    secret: this.secret,
                    attributes: [
                        ['NAS-IP-Address', '10.5.5.5'],
                        ['User-Name', '922387915382853632|pc'],
                        ['User-Password', 'QD3UFGzih8Y7u6uKqv_dvaimo7x9VWMHNG6swbGwcIA'],
                        ['NAS-Identifier', 'CDSXXX'],
                    ]
                });

                var client = dgram.createSocket("udp4");
                client.on("message", (data) => {
                    if (++this.count === this.loop) {
                        console.timeEnd(`send${i}`);
                        console.log(`Test over`);
                    }
                    console.log(this.count);
                    //
                    // let packet = radius.decode({packet: data, secret: this.secret});
                    // console.log(packet);
                    resolve(true);
                })
                client.send(response, 0, response.length, 1812, "39.106.146.46", function (err, bytes) {
                    if (err) {
                        console.log('Error sending response to ');
                    }
                    console.log(`Send success`);
                    // resolve(true);
                });
            }))
        }
    }

    async run() {
        this.auth();
        if (0 !== this.loginList.length) {
            await Promise.all(this.loginList);
        }
    }
}

async function main() {
    if (3 > process.argv.length) {
        console.log(`Usage: node XX [num]`);
    } else {
        let num: string = process.argv[2];

        let radius: RadiusTest = new RadiusTest('ooo', parseInt(num));
        await radius.run();
    }

}

main();

