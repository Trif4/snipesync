require('dotenv').config();

const numbers = /^[0-9]+$/;
let channels = [process.env.CHANNEL_NAME];
let activeChannels = [process.env.CHANNEL_NAME];
let countdownLength = 5;
let timeouts = [];

const tmi = require('tmi.js');
const moment = require('moment');

// Define configuration options
const opts = {
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.OAUTH_TOKEN
  },
  options: {
    clientId: process.env.CLIENT_ID
  },
  channels
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
async function onMessageHandler (channel, userstate, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  if (!msg.startsWith('!')) { return; } // Only listen to commands
  if (!channels.includes('#' + userstate['username'].toLowerCase())
      && userstate['username'].toLowerCase() !== 'trif4') { return; } // Only listen to streamers and Trif

  const channelName = channel.toLowerCase();
  // Remove whitespace from chat message
  const commandName = msg.trim();

  // If the command is known, let's execute it
  if (commandName.startsWith('!scd')) {
    if (!['trif4', 'harddrop'].includes(userstate['username'].toLowerCase())) {
      return;
    }

    let duration;

    const minutesString = commandName.slice('!scd '.length);
    if (!!minutesString.length) {
      if (!minutesString.match(numbers)) {
        client.say(channel, "That doesn't seem right. The syntax is !scd 23 if you want a countdown at XX:23.");
        return;
      }
      const minutes = parseInt(minutesString, 10);
      const now = moment();
      const target = moment();
      target.minutes(minutes);
      if (target.isBefore(now)) {
        target.add(1, 'h');
      }
      duration = target.diff(now);
      if (duration / 1000 > 20 * 60) {
        client.say(channel, "You're trying to set a countdown to over 20 minutes in the future. I assume that's a mistake. I'll give you another try.");
        return;
      }
      broadcast(activeChannels, `-- NEW GAME STARTING AT XX:${minutesString} --`);
    } else {
      duration = countdownLength * 1000;
      broadcast(activeChannels, `-- NEW GAME STARTING IN ${countdownLength} SECONDS --`);
    }

    function countdownMessage(seconds) {
      if (seconds === 0) {
        broadcast(activeChannels, `-- GO! --`);
      } else if (seconds <= 3) {
        broadcast(activeChannels, `${seconds}...`);
      } else if (seconds === 5) {
        broadcast(activeChannels, '-- Get ready! 5 seconds! --');
      } else if (seconds === 10)  {
        broadcast(activeChannels, `-- 10 seconds till next game! --`);
      } else if (seconds === 30)  {
        broadcast(activeChannels, `-- 30 seconds till next game! --`);
      } else if (seconds === 60)  {
        broadcast(activeChannels, `-- Next game starts in 1 minute! --`);
      }
    }

    for (const i of [0, 1, 2, 3, 5, 10, 30, 60]) {
      const msLeft = i * 1000;
      if (msLeft < duration) {
        timeouts.push(setTimeout(countdownMessage, (duration - msLeft), i));
      }
    }
    console.log(`* Started ${duration / 1000} second countdown`);

  } else if (commandName === '!scancel') {
    if (!['trif4', 'harddrop'].includes(userstate['username'].toLowerCase())) {
      return;
    }
    for (const timeout of timeouts) {
      clearTimeout(timeout);
    }
    broadcast(activeChannels, '-- The countdown has been cancelled. --');

  } else if (commandName === '!sjoin') {
    if (activeChannels.includes(channelName)) {
      client.say(channel, 'Already synced. Type !sleave to unsync.');
    } else {
      if(await isVIPOrMod(channel)) {
        activeChannels.push(channelName);
        client.say(channel, 'Synced and ready for countdown! Type !sleave when you want to unsync.');
        console.log(`* ${channel} joined sync`);
      } else {
        setTimeout(() => client.say(channel, "Sorry, due to Twitch messaging limits, I need a fancy badge to do countdowns properly – please give me VIP or Moderator status, then try again."), 1500);
      }
    }

  } else if (commandName === '!sleave') {
    if (activeChannels.includes(channelName)) {
      activeChannels = activeChannels.filter(c => c !== channelName);
      client.say(channel, 'Left synced countdown.');
      console.log(`* ${channel} left sync`);
    } else {
      client.say(channel, 'Not in sync already.');
    }

  } else if (commandName === '!slist') {
    client.say(channel, `Currently synced channels: ${activeChannels.join(', ').replace('#', '')}`);

  } else if (commandName.startsWith('!sinvite')) {
    const target = commandName.slice('!sinvite '.length).toLowerCase();
    if (!!target) {
      console.log(`* Joining channel ${target}`);
      channels.push('#' + target);
      client.join('#' + target).then(async () => {
        let msg = `Hi! I'm a bot that counts down for games in every stream simultaneously. Countdowns are set by Blink.`;
        if(!await isVIPOrMod(target)) {
          msg += " Due to Twitch messaging limits, I need VIP or Mod status. Once I've been given this, the";
        } else {
          msg += " The";
        }
        msg += " streamer can type !sjoin to join synced countdowns.";
        client.say('#' + target, msg);
        client.say(channel, `Invited ${target} to join the countdowns.`);
      }).catch((err) => {
        client.say(channel, `Twitch didn't like that. Typo?`);
      })
    }

  } else if (commandName.startsWith('!sadd')) {
    if (userstate['username'].toLowerCase() !== 'trif4') { return; }
    const target = commandName.slice('!sadd '.length).toLowerCase();
    if (!!target) {
      console.log(`* Joining channel ${target}`);
      channels.push('#' + target);
      client.join('#' + target).then(async () => {
        if(await isVIPOrMod(target)) {
          activeChannels.push(target);
          console.log(`* ${channel} joined sync`);
          client.say('#' + target, "Hi! I'm a bot that counts down for games in every stream simultaneously. Countdowns are set by Blink. The streamer can opt out at any time by typing !sleave.");
        } else {
          client.say('#' + target, "Hi! I'm a bot that will count down for games in every stream simultaneously. Countdowns are set by Blink. Due to Twitch messaging limits, I need VIP or Mod status. Once I've been given this, the streamer can type !sjoin to join synced countdowns.");
        }
        client.say(channel, `Added ${target} to countdowns.`);
      }).catch((err) => {
        client.say(channel, `Twitch didn't like that. Typo?`);
      })
    }

  } else {
    console.log(`* Unknown command ${commandName}`);
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function broadcast(channels, msg) {
  for (const channel of channels) {
    client.say(channel, msg);
  }
}

async function isVIPOrMod(channel) {
  const vipsReq = client.vips(channel);
  const modsReq = client.mods(channel);
  const vips = await vipsReq;
  const mods = await modsReq;
  return vips.includes(process.env.BOT_USERNAME.toLowerCase()) || mods.includes(process.env.BOT_USERNAME.toLowerCase());
}

async function getGoodAndBadChannels() {
  const results = activeChannels.map(c => ({channel: c, good: isVIPOrMod(c)}));
  for (const r of results) {
    r.good = await r.good;
  }
  const good = results.filter(r => r.good).map(r => r.channel);
  const bad = results.filter(r => !r.good).map(r => r.channel);
  return [good, bad];
}
