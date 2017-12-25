module.exports = function(db, cb) {
    db.define("Settings", {
        name: String,
        value: String,
        option: String
    })
};