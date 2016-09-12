var React                   = require('react');
var Link                    = require('react-router').Link;
var ReactCSSTransitionGroup = require('react-addons-css-transition-group');

var Ajax   = require('./ajax.js');
var Config = require('./config.js');


var TWEET_HISTORY_LENGTH =   20;
var AD_FREQUENCY_MOD     =   30;
var POLL_INTERVAL_MS     = 1250;
var TRANSITION_ENTER_MS  =  500;
var TRANSITION_EXIT_MS   =  300;
var BOT_REGEX            = new RegExp("/bot|googlebot|crawler|spider|robot|crawling/i");
var ZODIAC_SIGNS         = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];


function getTimeDelta(timeMs) {
  var deltaMs = new Date().getTime() - timeMs;
  var deltaS  = Math.floor(deltaMs / 1000);
  var deltaM  = Math.floor(deltaS / 60);

  if (deltaM > 0) {
    return deltaM + "m";
  } else if (deltaS >= 5) {
    return (Math.round(deltaS / 5) * 5) + "s";
  } else {
    return "now";
  }
}

function filterRetweets(item, showRetweets) {
  if (showRetweets === true || item.text === undefined) {
    return true;
  } else {
    return item.text.startsWith("RT ") === false;
  }
}

function filterLinks(item, showLinks) {
  if (showLinks === true || item.text == undefined) {
    return true;
  } else {
    return item.text.includes("http:") === false && item.text.includes("https:") === false;
  }
}

function filterTweets(items, showRetweets, showLinks) {
  return items.filter(function(item) { return filterRetweets(item, showRetweets); })
              .filter(function(item) { return filterLinks(item, showLinks);       });
}

function shouldLoadAd(tweetCount, nextTweetCount) {
  return false;
  if (BOT_REGEX.test(navigator.userAgent)) { return false; }

  for (var count = (tweetCount + 1); count <= nextTweetCount; count++) {
    if ((count % AD_FREQUENCY_MOD) === 0) { return true; }
  }

  return false;
}

var TweetStreamHeader = React.createClass({
  onFilterChange: function(event) {
    if (event.target.id === "input-sign") {
      this.props.callback(event.target.value, null, null);
    } else if (event.target.id === "input-retweets") {
      this.props.callback(null, event.target.checked, null);
    } else {
      this.props.callback(null, null, event.target.checked);
    }
  },
  render: function() {
    var options = ZODIAC_SIGNS.map(function(sign) {
      return (<option key={sign} value={sign}>{sign}</option>);
    });

    return (
      <div className="tweetStreamHeader row">
        <div className="h1 col-xs-12 col-sm-12 col-md-5 col-lg-5">
          ZodiacTweets.com
        </div>
        <div className="tweetStreamSign col-xs-6 col-sm-7 col-md-4 col-lg-4">
          <select id="input-sign" className="form-control input-lg" onChange={this.onFilterChange}>
            {options}
          </select>
        </div>
        <div className="p col-xs-6 col-sm-5 col-md-3 col-lg-3">
          <div className="row col-xs-12 checkbox"><label>
            <input id="input-retweets" type="checkbox"
              defaultChecked={this.props.showRetweets} onChange={this.onFilterChange}/>
              RETWEETS
          </label></div>
          <div className="row col-xs-12 checkbox"><label>
            <input id="input-links" type="checkbox"
              defaultChecked={this.props.showLinks} onChange={this.onFilterChange}/>
              LINKS
          </label></div>
        </div>
      </div>
    );
  }
});

var TweetListTweet = React.createClass({
  getAccountHref: function() {
    return "https://twitter.com/" + this.props.tweet.handle;
  },
  getSignImgSrc: function() {
    return "/img/" + this.props.sign.toLowerCase() + ".jpg";
  },
  render: function() {
    return (
      <div className="tweetListItem tweetListTweet row">
        <a target="_blank" href={this.getAccountHref()}>
          <img className="tweetAccountImg" src={this.props.tweet.accountPic}/>
        </a>
        <span className="tweetHandle h3">
          <a target="_blank" href={this.getAccountHref()}>@{this.props.tweet.handle}</a>
        </span>
        <img className="tweetSignImg" src={this.getSignImgSrc()}/>
        <span className="tweetTimeDelta"> - {getTimeDelta(this.props.tweet.timeMs)}</span>
        <span className="p row">{this.props.tweet.text}</span>
      </div>
    );
  }
});

var TweetListAd = React.createClass({
  render: function() {
    return (
      <div className="tweetListItem tweetListAd row">
        <a target="_blank" href={this.props.ad.href}>
          <img src={this.props.ad.imgSrc} />
        </a>
      </div>
    );
  }
});

var TweetList = React.createClass({
  render: function() {
    var items = this.props.tweets.map(function(item) {
      if (item.text !== undefined) {
        return <TweetListTweet key={item.id} tweet={item} sign={this.props.sign} />;
      } else {
        return <TweetListAd key={item.id} ad={item} />;
      }
    }.bind(this));

    return (
      <div className="tweetList">
        <ReactCSSTransitionGroup
          transitionName="tweetList"
          transitionEnterTimeout={TRANSITION_ENTER_MS}
          transitionLeaveTimeout={TRANSITION_EXIT_MS}
        >
          {items}
        </ReactCSSTransitionGroup>
      </div>
    );
  }
});

var TweetStreamBox = React.createClass({
  loadAd: function() {
    Ajax.get(
      Config.adApi,
      function(data) {
        if (this.state.tweets.length >= TWEET_HISTORY_LENGTH) { this.state.tweets.pop(); }
        this.state.tweets.unshift(data);
        this.setState({ tweets : this.state.tweets });
      }.bind(this)
    );
  },
  getTweetsUrl: function() {
    return Config.tweetApi + "/" + this.state.sign + "/" + this.state.version;
  },
  loadTweets: function() {
    Ajax.get(
      this.getTweetsUrl(),
      function(data) {
        var tweets    = filterTweets(this.state.tweets, this.state.showRetweets, this.state.showLinks);
        var newTweets = filterTweets(data.tweets, this.state.showRetweets, this.state.showLinks);
        var newCount  = (this.state.count + newTweets.length);

        if (shouldLoadAd(this.state.count, newCount) === true) { this.loadAd(); }

        this.setState({
          count     : newCount,
          version   : data.version,
          tweets    : newTweets.concat(tweets).slice(0, TWEET_HISTORY_LENGTH),
          timeoutId : setTimeout(this.loadTweets, POLL_INTERVAL_MS)
        });
      }.bind(this)
    );
  },
  onFilterChange: function(sign, retweets, links) {
    var nextSign     = (sign     !== null) ? sign     : this.state.sign;
    var nextRetweets = (retweets !== null) ? retweets : this.state.showRetweets;
    var nextLinks    = (links    !== null) ? links    : this.state.showLinks;

    clearTimeout(this.state.timeoutId);
    this.setState({
      sign         : nextSign,
      version      : 0,
      tweets       : [],
      showRetweets : nextRetweets,
      showLinks    : nextLinks,
      timeoutId    : -1
    });
  },
  getInitialState: function() {
    return {
      sign         : ZODIAC_SIGNS[0],
      count        : 0,
      version      : 0,
      tweets       : [],
      showRetweets : true,
      showLinks    : true,
      timeoutId    : -1
    };
  },
  componentDidMount: function() {
    if (this.state.timeoutId === -1) { this.loadTweets(); }
  },
  componentDidUpdate: function() {
    if (this.state.timeoutId === -1) { this.loadTweets(); }
  },
  componentWillUnmount: function() {
    clearTimeout(this.state.timeoutId);
  },
  render: function() {
    return (
      <div>
        <div className="tweetStreamBox">
          <TweetStreamHeader showRetweets={this.state.showRetweets} showLinks={this.state.showLinks} callback={this.onFilterChange} />
          <TweetList sign={this.state.sign} tweets={this.state.tweets} />
        </div>
      </div>
    );
  }
});


module.exports = TweetStreamBox;
