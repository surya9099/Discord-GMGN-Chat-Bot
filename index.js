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
      // Ini akan menampung promise dari setTimeout
      let delayPromise = Promise.resolve(); 

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
          // Langsung panggil yang berikutnya tanpa delay jika channel ID tidak valid
          return sendMessageSequentially(index + 1); 
        }

        // --- Perubahan Ada di Sini ---
        // Tampilkan cooldown sebelum MENGIRIM pesan
        const delaySeconds = delayPerChannelMs / 1000;
        if (index > 0) { // Hanya tampilkan delay untuk channel ke-2 dan seterusnya
            console.log(
                `Waiting for ${delaySeconds} seconds before sending "${message}" to channel ${channelId}...`.grey
            );
            // Bungkus setTimeout ke dalam Promise agar pengiriman pesan menunggu delay selesai
            delayPromise = new Promise(resolve => {
                setTimeout(resolve, delayPerChannelMs);
            });
        } else {
            // Untuk channel pertama, tidak ada delay sebelumnya, langsung log persiapan kirim
            console.log(`Preparing to send "${message}" to channel ${channelId}...`.grey);
        }

        delayPromise.then(() => {
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
                // Setelah selesai mengirim (dan delay sebelumnya), panggil berikutnya
                sendMessageSequentially(index + 1);
              });
        }); // Tutup delayPromise.then()
      };

      sendMessageSequentially(); // Mulai pengiriman
    },
    null,
    true,
    'UTC'
  );
};

// Jadwal untuk dailyJob dan achievementsJob
// Waktu cron dihitung berdasarkan UTC. Untuk WIB (UTC+7):
// 02:00 UTC = 09:00 WIB
// 03:00 UTC = 10:00 WIB
const dailyJob = sendCronMessage('!daily', '0 2 * * *', 'green', 1000); // 1 detik cooldown
const achievementsJob = sendCronMessage('!achievements', '0 3 * * *', 'blue', 2000); // 2 detik cooldown

dailyJob.start();
achievementsJob.start();

// Pesan banner Surya99 yang muncul saat bot dimulai
console.log('\n===================================='.cyan);
console.log('         Surya99 Discord Bot        '.cyan);
console.log('====================================\n'.cyan);

console.log('Bot Mengirim Pesan dimulai.'.yellow);
