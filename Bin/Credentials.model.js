const mongoose = require('mongoose');

const credentialsSchema = new mongoose.Schema({
    identifier: {
        type: String,
        default: 'singleton',
        unique: true
    },
    clientId: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true
    }
});

const Credentials = mongoose.model('Credentials', credentialsSchema);

module.exports = Credentials;