var express = require('express');
var url = require('url');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	var query = url.parse(req.url,true).query;
	var roomname = query.roomname;
	var uid = query.uid;
	res.render('chatroom', { roomname:roomname, uid:uid });
});

module.exports = router;
