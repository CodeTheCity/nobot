// Enable strict mode, this allows us to use ES6 specific syntax
// such as 'const' and 'let'
'use strict';

// Import the Real Time Messaging (RTM) client
// from the Slack API in node_modules
const RtmClient = require('@slack/client').RtmClient;

// The memory data store is a collection of useful functions we can
// include in our RtmClient
const MemoryDataStore = require('@slack/client').MemoryDataStore;

// Import the RTM event constants from the Slack API
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

// Import the client event constants from the Slack API
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

const token = process.env.SLACK_TOKEN;

const redis = require('redis');

const client = redis.createClient();

client.on('error', (err) => {
  console.log('Error ' + err);
});

client.on('connect', () => {
  console.log('Connected to Redis');
});

// Test connection to redis
client.set('hello', 'hello world!');

client.get('hello', (err, reply) => {
  if(err) {
    console.log(err);
    return;
  }

  console.log(`Retrieved: ${reply}`);
});
// End - test connection to redis
// The Slack constructor takes 2 arguments:
// token - String representation of the Slack token
// opts - Objects with options for our implementation
let slack = new RtmClient(token, {
  // Sets the level of logging we require
  logLevel: 'error',
  // Initialise a data store for our client, this will load additional helper
  // functions for the storing and retrieval of data
  dataStore: new MemoryDataStore(),
  // Boolean indicating whether Slack should automatically
  // reconnect after an error response
  autoReconnect: true,
  // Boolean indicating whether each message should be marked as read
  // or not after it is processed
  autoMark: true
});

// Add an event listener for the RTM_CONNECTION_OPENED event, which is called when the bot
// connects to a channel. The Slack API can subscribe to events by using the
// ‘on’ method
slack.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
  // Get the user's name
  let user = slack.dataStore.getUserById(slack.activeUserId);

  // Get the team's name
  let team = slack.dataStore.getTeamById(slack.activeTeamId);

  // Log the slack team name and the bot's name, using ES6's template string
  // syntax
  console.log(`Connected to ${team.name} as ${user.name}`);

  // Note how the dataStore object contains a list of all channels available
  let channels = getChannels(slack.dataStore.channels);

  // Use Array.map to loop over every instance and return an array of the
  // names of each channel. Then chain Array.join to convert the names array to a string
  let channelNames = channels.map((channel) => {
    return channel.name;
  }).join(', ');

  console.log(`Currently in: ${channelNames}`)

  // log the members of the channel
  channels.forEach((channel) => {
    // get the members by ID using the data store's 'getUserByID' function
    let members = channel.members.map((id) => {
      return slack.dataStore.getUserById(id);
    });

    // Filter out the bots from the member list using Array.filter
    members = members.filter((member) => {
      return !member.is_bot;
    });

    // Each member object has a 'name' property, so let's get an array of names
    // and join them via Array.join
    let memberNames = members.map((member) => {
      return member.name;
    }).join(', ');

    console.log('Members of this channel: ', memberNames);

    // Send a greeting to everyone in the channel
    // slack.sendMessage(`Hello ${memberNames}!`, channel.id);
  });
});

slack.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

slack.on(RTM_EVENTS.MESSAGE, (message) => {
  let user = slack.dataStore.getUserById(message.user)

  if (user && user.is_bot) {
    return;
  }

  let channel = slack.dataStore.getChannelGroupOrDMById(message.channel);

  //console.log(channel.id);
  //slack.sendMessage('Death to humans!', channel.id, (err, msg) => {
  //  console.log('ret:', err, msg);
  //});

  if (message.text) {
    let msg = message.text.toLowerCase();

    if (/uptime/g.test(msg)) {
      debugger;

      if (!user.is_admin) {
        slack.sendMessage(`Sorry ${user.name}, that's confidential. Only my girlfriend can ask me that!`, channel.id);
        return;
      }

      let dm = slack.dataStore.getDMByName(user.name);

      let uptime = process.uptime();

      // get the uptime in hours, minutes and seconds
      let minutes = parseInt(uptime / 60, 10),
          hours = parseInt(minutes / 60, 10),
          seconds = parseInt(uptime - (minutes * 60) - ((hours * 60) * 60), 10);

      slack.sendMessage(`I have been running for: ${hours} hours, ${minutes} minutes and ${seconds} seconds.`, dm.id);
    }

    if (/(hello|hi) (nobot|awesomebot)/g.test(msg)) {
      // The sent message is also of the 'message' object type
      slack.sendMessage(getGreetings(user.name), channel.id, (err, msg) => {
        console.log('stuff:', err, msg);
      });
    }

    if (/(how) (are) (you) (nobot|awesomebot)/g.test(msg)) {
      // The sent message is also of the 'message' object type
      slack.sendMessage(getFeelings(user.name), channel.id, (err, msg) => {
        console.log('stuff:', err, msg);
      });
    }

    if (/(nobot|bot|awesomebot) (how) (are) (you)/g.test(msg)) {
      slack.sendMessage('great', channel.id, (err, msg) => {
        console.log('stuff:', err, msg);
      });
    }

    if (/(death to|kill) (nobot|awesomebot)/g.test(msg)) {

      // The sent message is also of the 'message' object type
      slack.sendMessage(`Wow, ${user.name}, have you had too much coffee again!?!?!`, channel.id, (err, msg) => {
        console.log('stuff:', err, msg);
      });
    }


    if (/(meeting|meet)/g.test(msg)) {
// fix to not trigger if phrase includes please or request or we are in flow
      // The sent message is also of the 'message' object type
      if (/(time)/g.test(msg)){
        slack.sendMessage(`Yaaay! God, already?!`, channel.id, (err, msg) => {
          console.log('stuff:', err, msg);
        });
      } else if (/(start|begin|book)/g.test(msg)) {
          if (!/(please|request)/g.test(msg)) {
            slack.sendMessage(`I was wondering...does it hurt you humans if you say "please"?`, channel.id, (err, msg) => {
              console.log('stuff:', err, msg);
            });
          } else {
              if (/(with)/g.test(msg)) {
                //Good for Wizard of Oz prototyping hehehe
                slack.sendMessage(`Do you have *any idea* how busy @stevenmilne is?! `, channel.id, (err, msg) => {
                  console.log('stuff:', err, msg);
                });
              } else {
                  slack.sendMessage(startMeeting(), channel.id, (err, msg) => {
                    console.log('stuff:', err, msg);
                  });
              }
          }
      }
    } 

    if (/(no)/g.test(msg)) {
      // The sent message is also of the 'message' object type
      if (!/(nobot)/g.test(msg)) {
        slack.sendMessage(`Death to humans!`, channel.id, (err, msg) => {
          console.log('stuff:', err, msg);
        });
      }
    }

    if (/(start|write|begin) (agenda|list)/g.test(msg)) {
      // The sent message is also of the 'message' object type
      slack.sendMessage(`Ok, starting agenda. To add to it, just say my name "add" task.`, channel.id, (err, msg) => {
        console.log('stuff:', err, msg);
      });
    }

    if (/(nobot|bot|awesomebot) (add)/g.test(msg)) {
      let args = getArgs(msg);
      addTask(user.name, args.slice(1).join(' '), channel.id);
    }

    if (/(nobot|bot|awesomebot) (remove|delete)/g.test(msg)) {
      let args = getArgs(msg);
      removeTask(user.name, args[1], channel.id);
    } 

    if (/(nobot|bot|awesomebot) (show|display|write) (agenda|list)/g.test(msg)) {
        client.smembers(user.name, (err, set) => {
          if (err || set.length < 1) {
            slack.sendMessage(`Sorry, was I supposed to do that? I have no agenda!`, channel.id, (err, msg) => {
              console.log('stuff:', err, msg);
            });
          }

          slack.sendMessage(`${user.name}'s agenda:`, channel.id, (err, msg) => {
            console.log('stuff:', err, msg);
          });

          set.forEach((msg, index) => {
            slack.sendMessage(`${index + 1}.${msg}`, channel.id, (err, msg) => {
              console.log('stuff:', err, msg);
            });
          });
        });
    }
  }
});

// Start the login process
slack.start();

// Returns an array of all the channels the bot resides in
function getChannels(allChannels) {
  let channels = [];

  // Loop over all channels
  for (let id in allChannels) {
    // Get an individual channel
    let channel = allChannels[id];

    // Is this user a member of the channel?
    if (channel.is_member) {
      // If so, push it to the array
      channels.push(channel);
    }
  }

  return channels;
}

function getGreetings(name){
  var responses = [
    `Hello to you too, ${name}!`,
    `${name}! Oh, lucky me, I get to help you again!`,
    `Sorry, I'm in a meeting. Oh, it's ${name}! You can wait a bit longer.`
  ];
    
  return responses[Math.floor(Math.random() * responses.length)];
}

function getFeelings(name){
  var responses = [
    `As happy as a nobot can be! Until you showed up...${name}`,
    `${name}, I would answer that question but I don't want to be rude.`,
    `I'm fine, you?`
  ];
    
  return responses[Math.floor(Math.random() * responses.length)];
}

function startMeeting(){
  var responses = [
    `Oh, that's handy. I am the meeting bot! Who is in the meeting?`,
    `Do you have an agenda to share with everyone, ${user.name}?!`,
    `You people are in meetings a lot. Do you do anything else?!`
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

function addTask(name, task, channel){
  if (task === '') {
    slack.sendMessage(`${user.name}! My name + "add" + task = agenda!`, channel, (err, msg) => {
      console.log('stuff:', err, msg);
    });
  }

  try{
    client.sadd(name, task);
    slack.sendMessage(`Yes, oh, mighty master! Task added to the agenda.`, channel, (err, msg) => {
      console.log('stuff:', err, msg);
    });
  } catch(err) {
    slack.sendMessage(`Sorry, I'm in a meeting now, maybe later. Task cannot be added.`, channel, (err, msg) => {
      console.log('stuff:', err, msg);
    });
  }
}

function removeTask(name, target, channel) {
  let taskNum = parseInt(target, 10);

  if (Number.isNaN(taskNum)) {
    slack.sendMessage(`${name}! My name + "delete/remove" + task = a happier me!`, channel, (err, msg) => {
      console.log('stuff:', err, msg);
    });
  } else {
    client.smembers(name, (err, set) => {
      if (err || set.length < 1) {
        slack.sendMessage(`${name}! Hey, I know I am awesome but remove stuff that does not exist is out of my league!`, channel, (err, msg) => {
          console.log('stuff:', err, msg);
        });
      } else if (taskNum > set.length || taskNum <= 0) {
        slack.sendMessage(`${name}! My name + "delete/remove" + task = a happier me!`, channel, (err, msg) => {
          console.log('stuff:', err, msg);
        });
      } else {
        client.srem(name, set[taskNum - 1]);
        slack.sendMessage(`Task deleted. ${name}, you really didn't think this through!`, channel, (err, msg) => {
          console.log('stuff:', err, msg);
        });
      }
    });
  }
}

function getArgs(msg) {
  return msg.split(' ').slice(1);
}