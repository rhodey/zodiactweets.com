var Ajax = function() { };


Ajax.prototype.get = function(url, callback) {
  $.ajax({
    url: url,
    dataType: 'json',
    cache: false,
    success: callback,
    error: function(xhr, status, err) {
      console.error(url, status, err.toString());
    }
  });
};


module.exports = new Ajax();
