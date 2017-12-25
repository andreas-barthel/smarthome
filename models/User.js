module.exports = function(db, cb) {
    db.define("User", {
        id: Number,
        name: String,
        password: String,
        type: ['admin', 'user']
    });
};