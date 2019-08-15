var co = require("co");
var radius = require("radius");
var dgram = require("dgram");


class test {
    loginList = [];
    accList = [];
    acuList = [] ;
    runTest() {
        for (let i = 0; i < 10; i++) {
            this.loginList.push(new Promise(function (resolve, reject) {
                console.time(`send${i}`);
                var response = radius.encode({
                    code: "Access-Request",
                    secret: "ooo",
                    attributes: [
                        ['NAS-IP-Address', '10.5.5.5'],
                        ['User-Name', '922387915382853632|pc'],
                        ['User-Password', '-W15Iq7o0sNqSVJlaDZChncUKi3P6R53FPA2TGr6Vis'],
                        ['NAS-Identifier', 'CDSXXX'],
                    ]
                });

                var client = dgram.createSocket("udp4");
                console.log("发送acqd")
                 client.on("message",function(data){
                    console.timeEnd(`send${i}`);
                    console.log(data);
                    resolve(true);
                })
                client.send(response, 0, response.length, 1812, "47.94.214.150", function (err, bytes) {
                    if (err) {
                        console.log('Error sending response to ');
                    }
                    // resolve(true);
                });
            }))
        }

        // for (var i = 0; i < 2000; i++) {
        //     this.accList.push(new Promise((resolve, reject) => {
        //         var response = radius.encode({
        //             code: 'Accounting-Request',
        //             identifier: 'dddddddd',
        //             secret: 'ooo',
        //             attributes: [
        //                 ['Acct-Status-Type','Start'],
        //                 ['User-Name', '922387915382853632|pc'],
        //                 ['NAS-Port', 1],
        //                 ['NAS-IP-Address', '10.0.3.4'],
        //                 ['Framed-IP-Address', '10.2.0.252'],
        //                 ['NAS-Identifier', 'Cisco 4400 (Anchor)'],
        //                 ['Acct-Session-Id', '4fecc41e/7c:c5:37:ff:f8:af/9'],
        //                 ['Acct-Authentic', 'RADIUS'],
        //                 ['Tunnel-Private-Group-Id', '5'],
        //                 ['Acct-Status-Type', 'Start'],
        //                 ['Calling-Station-Id', '7c:c5:37:ff:f8:af'],
        //                 ['Called-Station-Id', '00:22:55:90:39:60']
        //             ]
        //         });
        //         var client = dgram.createSocket("udp4");
        //         console.log("send accStart")
        //         client.send(response, 0, response.length, 1813, "47.94.214.150", function (err, bytes) {
        //             if (err) {
        //                 console.log('Error sending response to ');
        //             }
        //             resolve(true);
        //         });
                
        //     }))


        // }
        // for (var i = 0; i < 2000; i++) {
        //     this.accList.push(new Promise((resolve, reject) => {
        //         var response = radius.encode({
        //             code: 'Accounting-Request',
        //             identifier: 'dddddddd',
        //             secret: 'ooo',
        //             attributes: [
        //                 ['Acct-Status-Type','Interim-Update'],
        //                 ['User-Name', '922387915382853632|pc'],
        //                 ['NAS-Port', 1],
        //                 ['NAS-IP-Address', '10.0.3.4'],
        //                 ['Framed-IP-Address', '10.2.0.252'],
        //                 ['NAS-Identifier', 'Cisco 4400 (Anchor)'],
        //                 ['Acct-Session-Id', '4fecc41e/7c:c5:37:ff:f8:af/9'],
        //                 ['Acct-Authentic', 'RADIUS'],
        //                 ['Tunnel-Private-Group-Id', '5'],
        //                 ['Acct-Status-Type', 'Start'],
        //                 ['Calling-Station-Id', '7c:c5:37:ff:f8:af'],
        //                 ['Called-Station-Id', '00:22:55:90:39:60']
        //             ]
        //         });
        //         var client = dgram.createSocket("udp4");
        //         // client.on("message",function(data){
        //         //     console.log(data);
        //         //     resolve(true);
        //         // })
        //         client.send(response, 0, response.length, 1813, "47.94.214.150", function (err, bytes) {
        //             if (err) {
        //                 console.log('Error sending response to ');
        //             }
        //             resolve(true);
        //         });
        
        //     }))


        // }
        var _self = this;
        co(function* () {
            yield _self.loginList;
            console.log("acq结束")
            // yield _self.accList;
            // console.log("acc结束")
            // yield _self.acuList;
            // console.log('acu结束')
        })
    }
}
var t = new test();
t.runTest();