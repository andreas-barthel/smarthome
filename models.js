module.exports = function(db, cb) {
    db.load('./models/Rule.js', function(err) {
        if(err) return cb(err);
    });

    db.load('./models/User.js', function(err) {
        if(err) return cb(err);
    });

    db.load('./models/Settings.js', function(err) {
        if(err) return cb(err);
    });

    db.load('./models/Session.js', function(err) {
        if(err) return cb(err);
    });

    return cb();
    
};