require('dotenv').config();
require('colors');
const { CronJob } = require('cron');
const Discord = require('discord-simple-api');
const fs = require('fs');

if (!process.env.DISCORD_TOKEN) {
  console.error('The DISCORD_TOKEN is not set in .env file.'.red);
  process.exit(1);
}

const bot = new Discord(process.env.DISCORD_TOKEN);

let channelIDs;
try {
  if (!fs.existsSync('channels.txt')) {
    throw new Error('channels.txt file does not exist.');
  }
  channelIDs = fs
    .readFileSync('channels.txt', 'utf-8')
    .split('\n')
    .filter(Boolean);
} catch (error) {
  console.error(error.message.red);
  process.exit(1);
}

const sendCronMessage = (message, time, color, delayPerChannelMs = 1000) => {
  return new CronJob(
    time,
    () => {
      const sendMessageSequentially = (index = 0) => {
        if (index >= channelIDs.length) {
          console.log(`All messages for "${message}" sent.`.yellow);
          return;
        }

        const channelId = channelIDs[index];
        if (!channelId.match(/^\d+$/)) {
          console.error(
            `Invalid channel ID "${channelId}" found in channels.txt`.red
          );
          return sendMessageSequentially(index + 1);
        }

        bot
          .sendMessageToChannel(channelId, message)
          .then((res) => {
            const logMessage = `Channel ID : ${channelId} | Message : ${
              res.content
            } | Date : ${new Date().toUTCString()}`;
            console.log(logMessage[color]);
            fs.appendFile('logs.txt', logMessage + '\n', (err) => {
              if (err) console.error('Failed to write to logs.txt'.red, err);
            });
          })
          .catch((err) => {
            const errorLog = `Failed to send message to channel ${channelId} | Date : ${new Date().toUTCString()} | Error : ${
              err.response.data.message
            }`;
            console.error(errorLog.red);
            fs.appendFile('logs.txt', errorLog + '\n', (err) => {
              if (err) console.error('Failed to write to logs.txt'.red, err);
            });
          })
          .finally(() => {
            setTimeout(() => sendMessageSequentially(index + 1), delayPerChannelMs);
          });
      };

      sendMessageSequentially();
    },
    null,
    true,
    'UTC'
  );
};

const dailyJob = sendCronMessage('!daily', '0 2 * * *', 'green', 1000);
const achievementsJob = sendCronMessage('!achievements', '0 3 * * *', 'blue', 2000);

dailyJob.start();
achievementsJob.start();

// Pesan ini akan muncul di konsol saat bot dimulai/running
console.log('\n===================================='.cyan);
console.log('         Surya99 Discord Bot        '.cyan);
console.log('====================================\n'.cyan);

console.log('Bot Mengirim Pesan dimulai.'.yellow);
