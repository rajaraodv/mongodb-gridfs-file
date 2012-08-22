var express = require('express');
var app = express();

var mongo = require('mongodb');
var GridStore = mongo.GridStore;
var Server = mongo.Server;
var ObjectID = mongo.ObjectID;
var Db = mongo.Db;

var fs = require('fs');


//Connect to MongoDB
var server = new Server('localhost', 27017, {auto_reconnect:true});
var db = new Db('exampleDb', server);

//Open Connection
db.open(function (err, db) {
    if (err) {
        console.log('Could not connect to MongoDB');
    } else {
        console.log('Connected to MongoDB');
    }
});

app.configure(function () {
    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser({uploadDir:__dirname + "/public/uploads"}));
});

app.post('/upload', function (req, res) {
    console.dir(req.files.pic);

    var gridStoreWrite = new GridStore(db, new ObjectID(), req.files.pic.name, "w",
        {chunkSize:1024, metadata:{"username":"raja"}});
    gridStoreWrite.writeFile(req.files.pic.path, function(err, result){
        if(err) {
            console.log("Write Error");
            return;
        }
        console.dir(result);
    });
});

//Function that will extract file from MongoDB, writes it to temporary file and then sends it back to browser
app.get('/image/:id', function (req, res) {
    var id = req.params.id;//Get the id

    //Create Out File path & get WRITE stream
    var outPutFromDBFile = __dirname + "/public/uploads/FromDB_" + id + ".png";
    var writeStream = fs.createWriteStream(outPutFromDBFile);

    //Construct ObjectID from 'id' string
    var BSON = require('mongodb').BSONPure;
    var o_id = BSON.ObjectID.createFromHexString(id);

    //Create GridStore in READ mode
    var gridStore = new GridStore(db, o_id, "r");
    gridStore.open(function (err, gridStore) {
        if (err) {
            console.log("error: " + err);
        }
        //Get READ stream
        var readStream = gridStore.stream(true);
        readStream.on("end", function () {
            console.log("End was called");
        });
        //When writing is done,
        readStream.on('close', function () {
            console.log("Close was called");
            res.sendfile(outPutFromDBFile);

        });
        //Simply 'pipe' read stream to write stream
        readStream.pipe(writeStream);

    });
});

app.listen(3000);
