module.exports = function (db) {
    return {
        startDb: function () {
            isAlready(db, "Users", function (result) {
                if (!result) {
                    db.createCollection("Users");
                    let users = db.collection('Users');
                    users.insert({
                        userName: 'admin',
                        password: 'admin',
                        yourName: 'Hoang Duc Long',
                        avt: 'avt1.jpg'
                    })
                }
            })
            isAlready(db, "Messages", function (result) {
                if (!result) {
                    db.createCollection("Messages");
                }
            })
            isAlready(db, "MessagesChatDetail", function (result) {
                if (!result) {
                    db.createCollection("MessagesChatDetail")
                }
            })
        }
    }
}

function isAlready(db, collection, callback) {
    db.listCollections().toArray(function (err, collections) {
        var length = collections.length;
        var isExist = false;
        for (let index = 0; index < length; index++) {
            var nameCollection = collections[index].name.toString();
            var coll = collection.toString();
            if (nameCollection === coll) {
                isExist = true;
            }

        }
        callback(isExist)
    })
}