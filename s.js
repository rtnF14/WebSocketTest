var http = require('http');
var fs = require('fs');
var path = require('path');
var qs = require('querystring');

http.createServer(function (req,res) {
	var url = req.url;
	var http_method = req.method;
	console.log("URL :" + url );
	console.log("Method : " + http_method)
	console.log(req.headers);
	console.log("\n");

	if (http_method == 'POST') {
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


	var filePath = "./login.html";
	var contentType = 'text/html';
	fs.readFile(filePath, function(error,content){
		if (error){
			res.writeHead(500);
			res.end("Error code: "+error.code+"\n");
			res.end()
		}
		else {
			console.log("Go!")
			res.writeHead(200, {'Content-Type': contentType});
			res.end(content,'utf-8')
		}
	})

}).listen(8080);