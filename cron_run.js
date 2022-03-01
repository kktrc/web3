var CronJob = require('cron').CronJob;
var job = new CronJob('0/10 * * * * ?', function() {
  console.log('You will see this message every second');
}, null, true);
job.start();