
if(window.chrome && window.chrome.bluetoothLowEnergy){
  module.exports = require('./chrome/bindings');
}
else if(window.bluetoothle){
  module.exports = require('./phonegap/bindings');
}
else{
  module.exports = require('./websocket/bindings');
}
