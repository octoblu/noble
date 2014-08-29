if(window.chrome && window.chrome.bluetoothLowEnergy){
  console.log('using chrome app bindings');
  module.exports = require('./chrome/bindings');
}
else if(window.bluetoothle){
  console.log('using phonegap bindings');
  module.exports = require('./phonegap/bindings');
}
else{
  console.log('using websocket bindings');
  module.exports = require('./websocket/bindings');
}
