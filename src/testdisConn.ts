var dgram = require('dgram');
var client = dgram.createSocket('udp4');

var message = new Buffer('hi server');


import * as radius from "radius";

var encoded = radius.encode({
    code: 'Disconnect-Request',
    identifier: 54,
    secret: 'ooo',
    attributes: [
        ['User-Name', 'mariticide-inquietation'],
        ['NAS-Identifier', 'Aglauros-charioted']
    ]
});

client.send(message, 0, message.length, 3799, '39.106.10.209', function (params: any) {
    console.log(params);
});

client.on('message', function (msg: any) {
    console.info('client know server has got the message')
});