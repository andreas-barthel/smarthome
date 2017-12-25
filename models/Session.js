module.exports = function(db, cb) {
    db.define("Session", {
        id: Number,
        sid: String,
    });

    db.models.Session.hasOne('user', db.models.User);	
};