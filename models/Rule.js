module.exports = function(db, cb) {
    db.define("Rule", {
        name: String,
        source: String,
        event: ['switchStateChanged'],
        target: String,
        action: ['toggleBoolean']
    });
};