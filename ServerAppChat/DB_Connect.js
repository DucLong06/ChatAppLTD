const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());
const server = require("http").createServer(app);
const { query } = require('express');
var handle = require("./Handle.js");

const MongoClient = require('mongodb').MongoClient;
const url = "mongodb+srv://mobile:mobile123@cluster0.cagxt.mongodb.net/messenger-database?retryWrites=true&w=majority"
MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    myDb = db.db('appchat')
    handle(myDb).startDb();
    console.log('mongodb connecting')

    console.log("conected")
})

function insertUser(user) {
    MongoClient.connect(url, function (err, db) {
        // const query = {
        //     userName=user.userName,
        //     password=user.password,
        // }
        console.log("conected")
    })
}