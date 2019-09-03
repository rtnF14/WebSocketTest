//Module Load
const http = require('http');
const fs = require('fs');
const qs = require('querystring');
const mysql = require('./mysql-master');
const WebSocket = require("./websocket");
WebSocket.Server = require("./websocket-server");
const crypto = require('crypto');


//Server configuration
const hostname = 'localhost';
const port = 3000;

//Send file to client via HTTP
function sendFile(res,filePath,contentType){
	fs.readFile(filePath, function(error,content){
		if (error){
			res.writeHead(500);
			res.end("Error code: "+error.code+"\n");
			res.end()
		}
		else {
			res.writeHead(200, {'Content-Type': contentType});
			res.end(content)
		}
	})
}



//---------------------------------------------------------
//Encryption Module for Cookie validation

let algorithm = 'aes-256-cbc';
let key = 'ExchangePasswordPasswordExchange';
let iv = crypto.randomBytes(16);
iv = iv.toString('hex').slice(0, 16);
function encrypt(text){
	let cipher = crypto.createCipheriv(algorithm,key,iv);
	let crypted = cipher.update(text,'utf8','hex');
	crypted += cipher.final('hex');
	return crypted;
}
function decrypt(text){
	let decipher = crypto.createDecipheriv(algorithm,key,iv);
	let dec = decipher.update(text,'hex','utf8');
	dec += decipher.final('utf8');
	return dec;
}
//---------------------------------------------------------





let clientUserAgent;

//Config http server
const server = http.createServer((req,res) => {
	//Printout HTTP request detail (for debug reasons)
	var url = req.url;
	var http_method = req.method;
	console.log("URL :" + url );
	console.log("Method : " + http_method)
	console.log(req.headers);
	console.log("\n");

	clientUserAgent = req.headers['user-agent']
	if (req.headers['cookie']) {
		console.log("ADA KUKI!")
		let cookie = req.headers['cookie']
		cookie = cookie.split('=')
		cookie = cookie[1]
		cookie = decrypt(cookie)
		console.log(cookie)

	}
	

	
	//Handle HTTP POST
	if ((http_method == 'POST')&&(url=='/l')) {
		var body = '';
		req.on('data', function(data){
			body+=data;
			if (body.length > 1e6)
				req.connection.destroy();
		});
		req.on('end', function(){
			var post = qs.parse(body);
			console.log(post)
		})
	}

	//Send favicon
	if (url == '/favicon.ico'){
		sendFile(res,"./logo.png","image/apng");
	}
	//Send index page
	else if (url == '/off.png'){
		sendFile(res,"./off.png","image/apng");
	}
	else {
		sendFile(res,"./login.html","text/html");
	}
})


// Start http server at port 3000
server.listen(port,hostname, () => {
	console.log('Server running at http://'+hostname+':'+port);
})

// Start websocket server at port 3001
const wss = new WebSocket.Server({port:3001});

// Start connection to mysql. Connect to "slm" database
var mysql_connection = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : 'root',
})
mysql_connection.connect()
mysql_connection.query('USE slm', function(err,rows,fields){
	if (err) throw err;
})




//Representing single client connection
class ClientConnection {
	constructor(ws,agent){
		this.ws = ws
		this.addr = ws._socket.remoteAddress
		this.port = ws._socket.remotePort
		this.uid = 0
		this.agent = agent
	}
	login(uid){
		this.uid = uid
	}
	clientID(){
		return String(this.uid) + "-" + String(this.addr) +"-"+String(this.port)+"-"+String(this.agent)
	}
	clientFingerprint(){
		return String(this.uid) + "-" +String(this.agent)
	}
	printClientInfo(){
		console.log(this.clientID())
	}
	

}

//Representing a whole client connections currently online
class listOfClients {
	constructor() {
		this.clients = []
	}
	addClient(c){
		this.clients.push(c)
	}
	removeClient(c){
		let cID = c.clientID()
		console.log(cID + " signing off..")
		let idx = this.clients.indexOf(c)
		if (idx > -1) {
			this.clients.splice(idx,1);
		}
	}
	printStatus(){
		console.log("Online users : "+this.clients.length)
		this.clients.forEach( v => {
			v.printClientInfo()
		})
	}
}


let onlineUsers = new listOfClients()





//When a single client connection come in
wss.on('connection', (ws,req) => {
	
	let client = new ClientConnection(ws,clientUserAgent)
	onlineUsers.addClient(client)
	onlineUsers.printStatus()

	//When the connection give us message
	ws.on('message', message => {
		//Handle message protocol
		var a = message.split("#");

		//Handle login
		if (a[0] == 'l') {
			let queryConstruct = "SELECT * FROM login_account WHERE u='" + a[1] + "' AND p='" + a[2] +"'"
			mysql_connection.query(queryConstruct, function(err,rows,fields){
				if (err) throw err;
				if (rows.length != 0){
					ws.send("l#1#"+rows[0].id)
					client.login(rows[0].id)
					client.printClientInfo()
					cookieID = encrypt(client.clientFingerprint())
					console.log(cookieID)
					console.log(decrypt(cookieID))
					ws.send("c#"+cookieID)
				}
				else{
					ws.send("l#0")
				}
			})
		}

	})

	ws.on('close', () => {
		console.log("closee!")
		onlineUsers.removeClient(client)
		onlineUsers.printStatus()
	})


	//Sandbox : Send to client via cmd
	ws.send('yo!')
	var stdin = process.stdin;
	stdin.setEncoding('utf-8');
	stdin.on('data', function(data){ws.send(data)})
})



