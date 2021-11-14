const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());
const server = require("http").createServer(app);
const port = 8080;
var handle = require("./Handle.js");
const io = require("socket.io")(server,{
    allowEIO3: true,cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
 });
var User = require('./model/Users.js');
var Message = require('./model/Messages.js');
var MessageChatDetail = require('./model/MessagesChatDetail.js');
const MongoClient = require('mongodb').MongoClient;
const { on } = require("process");
const { query } = require("express");
const { ObjectId } = require("mongodb");
var multer = require('multer');
var upload = multer({ dest: 'Uploads/' });
var cors = require('cors');
const jwt = require('jsonwebtoken');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(cors());

app.use(express.static('Uploads'))


const url = "mongodb+srv://mobile:mobile123@cluster0.cagxt.mongodb.net/messenger-database?retryWrites=true&w=majority"
MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, db) {
    if (err) throw err;
    myDb = db.db('appchat')
    handle(myDb).startDb();
    console.log('connecting');



    //conect to socket io
    io.on('connection', (socket) => {


        console.log(`ket noi thanh cong! ${socket.id}`)

        socket.on('disconnect', () =>
            console.log(`Disconnected: ${socket.id}`));
        socket.on('join', (room) => {
            console.log(`Socket ${socket.id} joining ${room}`);
            socket.join(room);
        });


        sendStatus = function (s) {
            socket.emit(s);
        }

        socket.on('chat_user', data => {
            let userOne = data.username;
            let userTwo = data.username_client;
            let ct = data.content;
            let time = data.time;
            checkAlready(myDb.collection('Messages'), userOne, userTwo, function (result) {
                let isAlready = result.isalready;
                console.log(isAlready)
                if (isAlready) {
                    let id = result.idchat;
                    // const myQuery = {
                    //     idMessage: id,
                    // }

                    const insert = {
                        idMessage: id,
                        usernameChat: userOne,
                        content: ct,
                        timeChat: time
                    }
                    myDb.collection('Messages').updateOne({ idMessage: id }, { $set: { lastTime: time } });
                    myDb.collection('MessagesChatDetail').insertOne(insert, function (err, result) {
                        if (err) {
                            throw err;
                        } else {
                            const obj = {
                                idMessage: id,
                                usernameChat: userOne,
                                content: ct,
                                timeChat: time,
                            }

                            socket.to(id).emit('re_user', obj)
                            socket.to(userTwo).emit(userTwo, obj)

                            const objMyself = {
                                idMessage: id,
                                usernameChat: userTwo,
                                content: ct,
                                timeChat: time,
                            }
                            socket.to(userOne).emit(userOne, objMyself)
                        }

                    })
                }

            })
        })

    })

    app.post('/delete_message', async (req, res) => {
        checkAlready(myDb.collection("Messages"), req.body.userOne, req.body.userTwo, function (result) {
            const query = {
                idMessage: result.idchat,
            }

            myDb.collection("Messages").deleteOne(query, function (err, result) {
                console.log("Xóa hội thoại thành công!")
            })
        })

    })

    app.post('/login', (req, res) => {
        const query = {
            userName: req.body.user.username,
            password: req.body.user.password
        }
        myDb.collection('Users').findOne(query, (err, result) => {
            if (result != null) {
                console.log('Tài khoản: ' + result.userName + " đã đăng nhập");
                var token = jwt.sign({ _id: result._id }, 'secrectkey');
                obj = {
                    status: 200,
                    data: result,
                    token: token
                }
                res.status(200).send(obj);
            } else {
                console.log('Không tìm thấy tài khoản!');
                obj = {
                    status: 400,
                }
                res.status(400).send(obj);
            }

        })

    })

    app.post('/signup', (req, res) => {
        let user = {
            userName: req.body.username,
            password: req.body.password,
            yourName: req.body.yourname,
            avt: null
        };
        console.log(user);
        let query = {
            userName: req.body.username
        }
        myDb.collection('Users').findOne(query, (err, result) => {
            if (result == null) {
                myDb.collection('Users').insertOne(user, (err, result) => {
                    res.status(200).send();
                })
            } else {
                res.status(400).send();
            }
        })
    })

    //check chat and result chat history
    app.post('/chat_solo', async (req, res) => {
        let usernameChat = req.body.username;
        let usernameClientChat = req.body.usernameclient;
        let timeCreated = req.body.time;
        let token = req.headers.token;
        var decode = jwt.verify(token, 'secrectkey');
        let check = await myDb.collection('Users').findOne({ userName: usernameChat });
        if (decode._id == check._id) {
            let _avt = await myDb.collection("Users").findOne({ userName: usernameClientChat });
            checkAlready(myDb.collection("Messages"), usernameChat, usernameClientChat, function (result) {
                let isalready = result.isalready;
                if (isalready) {
                    let _id = result.idchat;
                    let query = {
                        idMessage: result.idchat
                    }
                    myDb.collection("MessagesChatDetail").find(query).toArray(function (err, result) {
                        let obj = {
                            avt: _avt.avt,
                            idMessage: _id,
                            result: result
                        }
                        res.status(200).send(JSON.stringify(obj));
                    })
                } else {
                    const query = {
                        idMessage: usernameChat + '||' + usernameClientChat,
                        usenameOne: usernameChat,
                        usenameTwo: usernameClientChat,
                        timeCreate: timeCreated,
                        lastTime: timeCreated
                    }
                    myDb.collection("Messages").insertOne(query, (err, result) => {
                        let obj = {
                            avt: _avt.avt,
                            idMessage: query.idMessage,
                            result: []
                        }
                        res.send(JSON.stringify(obj));
                    })
                }
            })
        }
    })

    //tim ten user
    app.post('/search', async (req, res) => {
        let tk = req.body.token;
        let username = req.body.username;
        let username_search = req.body.username_search;
        let query = {
            userName: req.body.username_search
        }
        myDb.collection('Users').find(query, async (err, result) => {
            if (result != null) {
                let data = await myDb.collection("Messages").find({ 'idMessage': { $regex: username } }).sort({ lastTime: 1 }).toArray();

                let account;
                let obj = [];
                for (let index = 0; index < data.length; index++) {
                    let name = getUserNameClient(data[index].idMessage, username);
                    if (name == username_search) {
                        let query = {
                            userName: name,
                        }
                        account = await myDb.collection('Users').findOne(query);
                        let yourName = account.yourName;
                        const avt = account.avt;
                        let query_chat = {
                            idMessage: data[index].idMessage,

                        }
                        let data_chat = await myDb.collection("MessagesChatDetail").find(query_chat).sort({ timeChat: 1 }).toArray();
                        const chatTotal = data_chat;
                        if (chatTotal.length === 0) {
                            obj.unshift({ nameclient: name, yourname: yourName, content: data_chat.content, timechatlast: data_chat.timeChat, avt: avt })
                        } else {
                            objChat = chatTotal[chatTotal.length - 1]
                            obj.unshift({
                                nameclient: name,
                                yourname: yourName,
                                content: objChat.content,
                                timechatlast: objChat.timeChat,
                                avt: avt,
                            })
                        }
                    }
                }
                res.send(obj);
            } else {
                res.status(400).send();
            }
        })
    })

    app.post('/getuserchat', async (req, res) => {
        let username = req.body.username;
        let token = req.headers.token;

        var decode = jwt.verify(token, 'secrectkey');
        let check = await myDb.collection('Users').findOne({ userName: username });
        if (decode._id == check._id) {
            let data = await myDb.collection("Messages").find({ 'idMessage': { $regex: username } }).sort({ lastTime: 1 }).toArray();

            let account;
            let obj = [];
            for (let index = 0; index < data.length; index++) {
                let name = getUserNameClient(data[index].idMessage, username);
                let query = {
                    userName: name,
                }

                account = await myDb.collection('Users').findOne(query);
                let yourName = account.yourName;
                const avt = account.avt;
                let query_chat = {
                    idMessage: data[index].idMessage,

                }
                let data_chat = await myDb.collection("MessagesChatDetail").find(query_chat).sort({ timeChat: 1 }).toArray();
                const chatTotal = data_chat;
                if (chatTotal.length === 0) {
                    obj.unshift({ nameclient: name, yourname: yourName, content: data_chat.content, timechatlast: data_chat.timeChat, avt: avt })
                } else {
                    objChat = chatTotal[chatTotal.length - 1]
                    obj.unshift({
                        nameclient: name,
                        yourname: yourName,
                        content: objChat.content,
                        timechatlast: objChat.timeChat,
                        avt: avt
                    })
                }
            }
            res.send(obj)
        }
    })
    //cap nhat ho so
    app.post('/updateprof', async (req, res) => {
        let username = req.body.username;
        let myname = req.body.myname;
        let password = req.body.password;
        let token = req.headers.token;
        var decode = jwt.verify(token, 'secrectkey');
        let obj = [];
        let check = await myDb.collection('Users').findOne({ userName: username });
        if (decode._id == check._id) {
            if (password != "") {
                myDb.collection('Users').updateOne({ userName: username }, { $set: { yourName: myname, password: password } });
                obj = await myDb.collection('Users').findOne({ userName: username });
            }
            else {
                myDb.collection('Users').updateOne({ userName: username }, { $set: { yourName: myname } });
                obj = await myDb.collection('Users').findOne({ userName: username });
            }

            res.send(obj);
        }
    })
    //lay tat ca user ton tai
    app.post('/getalluser', async (req, res) => {
        let username = req.body.username;
        let token = req.headers.token;
        var decode = jwt.verify(token, 'secrectkey');
        let check = await myDb.collection('Users').findOne({ userName: username });
        if (decode._id == check._id) {
            myDb.collection('Users').find({ userName: { $nin: [req.body.username] } }).toArray(function (err, result) {
                res.send(JSON.stringify(result));
            })
        }

    })
})

async function checkAlready(messages, userNameOne, usernameTwo, callback) {
    let listUserOne = userNameOne + '||' + usernameTwo;
    let listUserTwo = usernameTwo + '||' + userNameOne;

    let query = {
        idMessage: listUserOne
    }

    let idChatResult = '';
    let checkChat = false;
    let resultObj = await messages.findOne(query)
    if (resultObj != null) {
        checkChat = true;
        idChatResult = listUserOne;
    }

    query = {
        idMessage: listUserTwo
    }
    resultTwo = await messages.findOne(query)
    if (resultTwo != null) {
        checkChat = true;
        idChatResult = listUserTwo;
    }

    if (checkChat) {
        let objectChat = {
            idchat: idChatResult,
            isalready: true
        }
        callback(objectChat);
    } else {
        let objectChat = {
            idchat: listUserOne,
            isalready: false
        }
        callback(objectChat)
    }
}

function getUserNameClient(idMessage, userName) {
    let userClient = '';
    let arrayUsename = idMessage.split('||')
    for (let index = 0; index < arrayUsename.length; index++) {
        if (!(arrayUsename[index] === userName)) {
            userClient = arrayUsename[index]
        }
    }
    return userClient
}

server.listen(port, () => {
    console.log("server running on port: " + port)
})

app.get('/', (req, res) => {
    res.send("hello world!");
})



