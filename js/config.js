var config = {};


if (__DEV__) {
  config.apiEndpoint = "http://" + process.env.DEV_HOST + ":8081/api";
} else {
  config.apiEndpoint = "/api";
}

config.tweetApi = config.apiEndpoint + "/zodiac/tweets";
config.adApi    = config.apiEndpoint + "/ads";


module.exports = config;
