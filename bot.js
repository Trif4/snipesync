require('dotenv').config()

let channels = [process.env.CHANNEL_NAME];
let activeChannels = [process.env.CHANNEL_NAME];
let countdownLength = 5;


const tmi = require('tmi.js');

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
  
  // Remove whitespace from chat message
  const commandName = msg.trim();

  // If the command is known, let's execute it
  if (commandName === '!scd') {
    if (!['trif4', 'harddrop'].includes(userstate['username'].toLowerCase())) { return; }
    const duration = countdownLength;
    //const [goodChannels, badChannels] = await getGoodAndBadChannels();
    function countdownMessage(seconds) {
      if (seconds === 0) {
        broadcast(activeChannels, `GO!`);
      } else if (seconds <= 3) {
        broadcast(activeChannels, `${seconds}...`);
      } else if (seconds === 5 && duration > 5) {
        broadcast(activeChannels, '5 seconds left!');
      }
    }
    broadcast(activeChannels, `-- NEW GAME STARTING IN ${duration} SECONDS --`);
    for (let i = duration; i >= 0; i--) {
      setTimeout(countdownMessage, (duration - i)*1000, i);
    }
    console.log(`* Started ${duration} second countdown`);
  } else if (commandName === '!sjoin') {
    if (activeChannels.includes(channel)) {
      client.say(channel, 'Already synced. Type !sleave to unsync.');
    } else {
      if(await isVIPOrMod(channel)) {
        activeChannels.push(channel);
        client.say(channel, 'Synced and ready for countdown! Type !sleave when you want to unsync.');
        console.log(`* ${channel} joined sync`);
      } else {
        setTimeout(() => client.say(channel, "Sorry, due to Twitch messaging limits, I need a fancy badge to do countdowns properly – please give me VIP or Moderator status, then try again."), 1500);
      }
    }
  } else if (commandName === '!sleave') {
    if (activeChannels.includes(channel)) {
      activeChannels = activeChannels.filter(c => c !== channel);
      client.say(channel, 'Left synced countdown.');
      console.log(`* ${channel} left sync`);
    } else {
      client.say(channel, 'Not in sync already.');
    }
  } else if (commandName === '!slist') {
    client.say(channel, `Currently synced channels: ${activeChannels.join(', ').replace('#', '')}`);
  } else if (commandName.startsWith('!sinvite')) {
    const target = commandName.slice('!sinvite '.length);
    if (!!target) {
      console.log(`* Joining channel ${target}`);
      channels.push('#' + target);
      client.join('#' + target).then(() => {
        let msg = `Hi! I'm a bot that counts down for games in every stream simultaneously. Countdowns are set by Blink.`
        if(!await isVIPOrMod(target)) {
          msg += " Due to Twitch messaging limits, I need VIP or Mod status. Once I've been given this, the"
        } else {
          msg += " The"
        }
        msg += " streamer can type !sjoin to join synced countdowns."
        client.say('#' + target, msg);
        client.say(channel, `Invited ${target} to join the countdowns.`);
      }).catch((err) => {
        client.say(channel, `Twitch didn't like that. Typo?`);
      })
    }
  } else if (commandName.startsWith('!sadd')) {
    if (userstate['username'].toLowerCase() !== 'trif4') { return; }
    const target = commandName.slice('!sadd '.length);
    if (!!target) {
      console.log(`* Joining channel ${target}`);
      channels.push('#' + target);
      client.join('#' + target).then(() => {
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
