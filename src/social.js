/*
TODO  
gmail
*/
// env file
// dotenv file
// .env

const dr = require('./dataRetrieval')
const PWORD = "pword"
require('dotenv').config()



// initialize groupme
const groupme = require('groupme').Stateless


// initialize Twitter
let Twitter = require('twitter')

var twitClient = new Twitter({
    consumer_key: process.env.TWIT_CONSUMER_KEY,
    consumer_secret: process.env.TWIT_CONSUMER_SECRET,
    access_token_key: process.env.TW_ACCESS,
    access_token_secret: process.env.TW_ACCESS_SECRET
});

// Discord
const Discord = require('discord.js');
const discClient = new Discord.Client();

discClient.on('ready', () => {
  console.log(`Logged in as ${discClient.user.tag}!`);
});

discClient.on('message', msg => {
    if (msg.channel.type != 'dm' || msg.author === discClient.user) {
        return;
    }
    manageContent(msg.content).then(reply => {msg.reply(reply)}).catch(reply => msg.reply(`error. ${reply}`))
})

/*  SYNTAX
    add channel <flags> "channelId" "pword"
        all fields required

        flags 
            -d discord
            -g groupme
        discord is default
    
    remove channel <flags> "channelId" "pword"
        same as add

    send announcement <flags> "announcement" "pword"
        flags
            -a all
            -d discord
            -g groupme
            -t twitter
        all is default
*/


// sending through discord management
manageContent = function(text) {
    return new Promise(function(resolve, reject) {
        if (passwordValid(text)) {
            // password is valid. continue...
            if (text.startsWith('add channel')) {
                // can only have one flag, channels are unique
                let key = readFlags(text, ['discord'])[0]
                let channel = extractFirstQuotedItem(text)
                dr.addChannel(key, channel).then(resolve(`added ${channel} to ${key}`)).catch(reject("addition failed"))
            } else if (text.startsWith('remove channel')) {
                // can only have one flag, channels are unique
                let key = readFlags(text, ['discord'])[0]
                let channel = extractFirstQuotedItem(text)
                dr.removeChannel(key, channel).then(resolve(`removed ${channel} from ${key}`)).catch(reject("addition failed"))
            } else if (text.startsWith('send announcement')) {
                let methods = readFlags(text, ['discord', 'groupme', 'twitter'])
                let announcement = extractFirstQuotedItem(text)
                    Promise.all([sendDiscordAnnouncement(announcement, methods.includes('discord')), 
                                sendGroupMeAnnouncement(announcement, methods.includes('groupme')), 
                                tweetAnnouncement(announcement, methods.includes('twitter'))])
                    .then(resolve("success!")).catch(reject("failure."))
            }
        }
        reject("operation failed.")
    })
}

/**
 * @returns either "discord", "groupme", "twitter", or a combination depending on the flags presented. if nothing presented or misformed text, returns deft
 */
readFlags = function(text, deft) {
    var rets = [];
    // all queries require quotes, and the flags must be before them. therefore, the flags only need to be checked before the first quote
    let quoteInd = text.indexOf('\"')
    for(var i=0; i<quoteInd - 1;i++) {
        if (text[i] === "-") {
            if (text[i + 1] === 'a') return deft        // if -a, return all, which is the default if available
            if (text[i + 1] === 'd')
                rets.push('discord')
            else if (text[i + 1] === 'g')
                rets.push('groupme')
            else if (text[i + 1] === 't')
                rets.push('twitter')
        }
    }
    return rets;
}

/**
 * @returns the first quoted item
 */
extractFirstQuotedItem = function(text) {
    // first thing in quotes. 
    let firstQuoteIndex = text.indexOf('\"')
    let secondQuoteIndex = text.indexOf('\"', firstQuoteIndex + 1)
    if (secondQuoteIndex == -1) throw new Error("malformed message")
    return text.substring(firstQuoteIndex + 1, secondQuoteIndex)
}

/**
 * @param {String} text the full message text sent to be analyzed
 * @returns true if the password found in the text matches the pword
 */
passwordValid = function(text) {
    // password is always the last thing in quotes
    // just find that and return if it matches the password on file
    let index = text.lastIndexOf('\"', text.length - 2)
    if (index == -1) throw new Error("malformed message")
    return text.substring(index + 1, text.length - 1) == PWORD
}

/** 
 * @param {String} announcement the text announcement to send
 * @param {Boolean} perform whether or not to actually send the announcement
 */
sendDiscordAnnouncement = function(announcement, perform) {
    if (!perform) return "discord: not sent.";
    return new Promise(function(resolve, reject) {
        dr.readChannels().then(channels => {
            Promise.all(generateDiscordSendings(announcement, channels)).then(resolve("discord: success!")).catch("discord: failure.")
        })
    })
}

generateDiscordSendings = function(announcement, channels) {
    var ret = []
    for (const chan of channels.discord) {
        ret.push(new Promise(function(resolve, reject) {
            if (discClient.channels.get(chan))
                discClient.channels.get(chan).send(announcement).then(resolve()).catch((e) => {console.log(e); reject(e);})
        }))
    }
    return ret
}

/**
 * @param {String} announcement the text announcement to send
 * @param {Boolean} perform whether or not to actually send the announcement
 */
sendGroupMeAnnouncement = async function(announcement, perform) {
    if (!perform) return "groupme: not sent.";
    let opts = {              // args for the message being sent
        message:{
            source_guid: "GUID",
            text:announcement,      // text send
            // attachments:[
            //     {type:"image", url:"https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"}
            // ]
        }
    }
    // send the message. params: access token, group id, options(defined above)
    dr.readChannels()
    .then(channels => {
        for (const chan of channels.groupme) {
            groupme.Messages.create(process.env.GROUPME_TOKEN, chan, opts,
            function callback(error, data) {
                if (!error) {
                    return true;                             // if the process is successful
                } else {
                    console.log(error)
                    return false;                              // if it is not
                }
            })
        }
    }).catch(e => {console.log(e)})
}

/**
 * @param {String} announcement the text announcement to send
 * @param {Boolean} perform whether or not to actually send the announcement
 */
tweetAnnouncement = function(announcement, perform) {
    if (!perform) return false;
    return new Promise(function(resolve, reject) {
        twitClient.post('statuses/update', {status: announcement})
        .then(function (tweet) {
            resolve("twitter: success!")
        })
        .catch(function (error) {
            reject("twitter: failure")
        })
    })
}



discClient.login(process.env.DISC_TOKEN);

