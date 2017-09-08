var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mysql = require('mysql');

var wait = require('./routes/wait');
var chatroom = require('./routes/chatroom');

var app = express();
app.io = require('socket.io')();

var conn = mysql.createConnection({
	user: 'root',
	password: '1234',
	database: 'foodshare'
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/wait', wait);
app.use('/chatroom', chatroom);

app.io.sockets.on('connection', function(socket){
	
	var roomName = null;
	var uid = null;
	
	socket.on('wait', function(data){
		socket.join(data);
	});
	
	socket.on('join', function(data){
		roomName = data.roomName;
		uid = data.uid
		
		socket.join(data.roomName);
		conn.query("select * from tbl_chat where roomname=?",[data.roomName], function(error,results){

			conn.query("update tbl_chat set isread='y' where roomname=? and writer <> ? and isread='n'",[data.roomName, data.uid]);
			app.io.to(socket.id).emit('getBeforeData',results);
		});
	});
	
	socket.on('message', function(data){
		conn.query("select rowid from tbl_sequence where tid='F004'", function(error, result){
			var hexRowId = parseInt(result[0].rowid, 16);
			var nextRowId = ++hexRowId;
			var stringNextRowId = nextRowId.toString(16);
			var formatNextRowId = '';
			if(stringNextRowId.length<6){
				for(var i = 0; i < (6-stringNextRowId.length); i++){
					formatNextRowId += '0';
				}
				formatNextRowId += stringNextRowId;
			}
		
			conn.query("update tbl_sequence set rowid=? where tid='F004'",[formatNextRowId]);
			conn.query("insert into tbl_chat (cid, writer, content, regtime, roomname) values (?,?,?,?,?)",[result[0].rowid, data.writer, data.content, data.regtime, roomName]);
		});
		
		app.io.sockets.to(roomName).emit('propaganda',data);
		app.io.sockets.to(roomName).emit('wakeup');
	});
	
	socket.on('editIsread', function(){
		conn.query("update tbl_chat set isread='y' where roomname=? and writer <> ? and isread='n'",[roomName, uid]);
	});
	
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
