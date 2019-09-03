const net = require('net');
const socket = net.createConnection({port:3306, host:'localhost'});
socket.on('connect',()=>{
	socket.on('data', data => {
		console.log(data.toString('latin1'));
	})
})