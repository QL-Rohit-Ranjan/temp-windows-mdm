const { execSync } = require("child_process");

const PING_TOPIC = "ping";
const POWER_LOGS_TOPIC = "power-logs";

const publishMessageToMqtt = (client, message, topic) => {
  // console.log("publish: =>", message);
  client.publish(topic, JSON.stringify(message), { qos: 2 });
};

const subscribeToMqttBroker = (client, topic) => {
  client.subscribe(topic, (err) => {
    if (err) {
      console.log(`Error occurred while subscribing to ${topic}:`, err);
    }
  });
};

const getSystemUUID = () => {
  try {
    const result = execSync("wmic csproduct get uuid").toString().trim();
    const [, uuid] = result.split("\n");
    return uuid.trim();
  } catch (error) {
    console.error("Error retrieving UUID:", error.message);
    return null;
  }
};

const sendMessageAsHeartBeat = (client) => {
  const msg = {
    deviceId: getSystemUUID(),
    timeStamp: new Date().getTime(),
  };

  publishMessageToMqtt(client, msg, PING_TOPIC);
};

module.exports = {
  PING_TOPIC,
  POWER_LOGS_TOPIC,
  getSystemUUID,
  publishMessageToMqtt,
  subscribeToMqttBroker,
  sendMessageAsHeartBeat,
};
