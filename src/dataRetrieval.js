const fs = require('fs')

let path = 'data/channels.json'

defaultIdHolder = {
    "discord":[],
    "groupme":[],
}

/**
 * adds a discord channel to the channels file
 */
exports.addChannel = function(key, channelId) {
    // TODO check if the channel exists?
    return new Promise(function(resolve, reject) {
        read0().then(results => {
            results[key].push(channelId)
            writeChannels(results).then(resolve(results)).catch(e => {reject(e)})
        }).catch(e => {reject(e)})
    })
}

/**
 * removes a channel from the channels file
 */
exports.removeChannel = function(key, channelId) {
    return new Promise(function(resolve, reject) {
        read0().then(results => {
            results[key] = results[key].filter((ele) => {
                return ele != channelId;
            })
            writeChannels(results).then(resolve(results)).catch(e => {reject(e)})
        }).catch(e => {reject(e)})
    })
}

/**
 * get all channel ids as an array of strings
 */
exports.readChannels = function() {
    return read0()
}

read0 = function() {
    return new Promise(function(resolve, reject) {
        fs.readFile(path, 'utf-8', (err, stringData) => { 
            if (err) reject(err)
            else {
                try {
                    resolve(JSON.parse(stringData))
                } catch {
                    console.log(`SOMETHING WRONG WITH ${stringData}`)
                    writeChannels(defaultIdHolder).then(resolve(defaultIdHolder)).catch(reject('incorrect parse'))
                }
            }
        })
    })
}

/**
 * write the channels specified in the channels array in json to the file given.
 */
writeChannels = async function(channels) {
    fs.writeFile(path, JSON.stringify(channels), (err) => { 
        if (err) throw err; 
    }) 
}
