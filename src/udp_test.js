const client = require('dgram').createSocket('udp4');
const sMsg = Buffer.from('hello');

client.bind(1813);
client.send(sMsg, 0, 5, 1812, '127.0.0.1', () => {
    console.log('Send msg success');
})
client.on('message', (msg, rinfo) => {
    console.log('Recv msg:', msg.toString());
})