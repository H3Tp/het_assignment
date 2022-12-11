const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    loginHistory: [
        {
            dateTime: Date,
            userAgent: String
        }
    ]
});

let User;

module.exports.initialize = function () {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection("mongodb+srv://admin:admin@cluster0.qsuyzn4.mongodb.net/?retryWrites=true&w=majority");

        db.on('error', (err) => {
            reject(err);
        });

        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
}

module.exports.registerUser = function (userData) {
    return new Promise(function (resolve, reject) {
        if (userData.password != userData.password2) {
            reject("Passwords do not match");
        } else {
            bcrypt.genSalt(10)
                .then(salt => bcrypt.hash(userData.password, salt))
                .then(hash => {
                    userData.password = hash;
                    let newUser = new User(userData);
                    newUser.save((err) => {
                        if (err) {
                            if (err.code == 11000) {
                                reject("User Name already taken");
                            } else {
                                reject("There was an error creating the user: " + err);
                            }
                        } else {
                            resolve();
                        }
                    });
                })
                .catch(err => {
                    console.log(err);
                    reject("There was an error encrypting the password");
                });
        }
    });
}

module.exports.checkUser = function (userData) {
    return new Promise((resolve, reject) => {
        User.findOne({ userName: userData.userName })
            .then((user) => {
                if (!user) {
                    reject(`Unable to find user: ${userData.userName}`);
                } else if (!bcrypt.compareSync(userData.password, user.password)) {
                    reject(`Incorrect password for user: ${userData.userName}`);
                } else {
                    user.loginHistory.push({ dateTime: new Date(), userAgent: userData.userAgent });
                    User.updateOne({ userName: user.userName }, { loginHistory: user.loginHistory })
                        .then(() => resolve(user))
                        .catch((err) => reject(`There was an error verifying the user: ${err}`));
                }
            })
            .catch(() => reject(`Unable to find user: ${userData.userName}`));
    });
}
