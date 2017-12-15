var Rule = {
    name: String,
    source: String,
    event: ['switchStateChanged'],
    target: String,
    action: ['toggleBoolean']
};

module.exports = Rule;