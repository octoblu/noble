'use strict';

var events = require('events');
var util = require('util');

var debug = require('debug')('bindings');

var ble = window.bluetoothle;


//included in newer bluetoothLE
function bytesToEncodedString(bytes) {
  return btoa(String.fromCharCode.apply(null, bytes));
}

function equalUuids(uuid1, uuid2){
  if(!uuid1 || !uuid2){
    return false;
  }
  uuid1 = uuid1.toLowerCase().split('-').join('').split(':').join('');
  uuid2 = uuid2.toLowerCase().split('-').join('').split(':').join('');

  if(uuid1.length === uuid2.length){
    return uuid1 === uuid2;
  }

  if(uuid1.length > 4){
    uuid1 = uuid1.substring(4,8);
  }

  if(uuid2.length > 4){
    uuid2 = uuid2.substring(4,8);
  }

  //TODO 6 byte uuids?

  return uuid1 === uuid2;

}

var NobleBindings = function() {

  var self = this;
  self.enabled = false;
  self._peripherals = {};
  self.platform = null;

  if(typeof window !== 'undefined' && window.device){
    self.platform = window.device.platform;
  }
  console.log('Device Platform: ', self.platform);

  console.log('phonegap (bluetoothle) noble bindings');

  ble.initialize(function(data){
    if(data.status === 'enabled'){
      self.enabled = true;
      console.log('ble initialized');
    }
  }, function(err){
    console.log('can\'t initialize ble', err);
  }, {request: true});

};

util.inherits(NobleBindings, events.EventEmitter);

NobleBindings.prototype._onOpen = function() {
  console.log('on -> open');
};

NobleBindings.prototype._onClose = function() {
  console.log('on -> close');

  this.emit('stateChange', 'poweredOff');
};

// NobleBindings.prototype._onMessage = function(event) {
//   var type = event.type;
//   var peripheralUuid = event.peripheralUuid;
//   var advertisement = event.advertisement;
//   var rssi = event.rssi;
//   var serviceUuids = event.serviceUuids;
//   var serviceUuid = event.serviceUuid;
//   var includedServiceUuids = event.includedServiceUuids;
//   var characteristics = event.characteristics;
//   var characteristicUuid = event.characteristicUuid;
//   var data = event.data ? new Buffer(event.data, 'hex') : null;
//   var isNotification = event.isNotification;
//   var state = event.state;
//   var descriptors = event.descriptors;
//   var descriptorUuid = event.descriptorUuid;
//   var handle = event.handle;

//   if (type === 'stateChange') {
//     console.log(state);
//     this.emit('stateChange', state);
//   } else if (type === 'rssiUpdate') {
//     this.emit('rssiUpdate', peripheralUuid, rssi);
//   } else if (type === 'includedServicesDiscover') {
//     this.emit('includedServicesDiscover', peripheralUuid, serviceUuid, includedServiceUuids);
//   } else if (type === 'read') {
//     this.emit('read', peripheralUuid, serviceUuid, characteristicUuid, data, isNotification);
//   } else if (type === 'broadcast') {
//     this.emit('broadcast', peripheralUuid, serviceUuid, characteristicUuid, state);
//   } else if (type === 'notify') {
//     this.emit('notify', peripheralUuid, serviceUuid, characteristicUuid, state);
//   } else if (type === 'descriptorsDiscover') {
//     this.emit('descriptorsDiscover', peripheralUuid, serviceUuid, characteristicUuid, descriptors);
//   } else if (type === 'valueRead') {
//     this.emit('valueRead', peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data);
//   } else if (type === 'valueWrite') {
//     this.emit('valueWrite', peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid);
//   } else if (type === 'handleRead') {
//     this.emit('handleRead', handle, data);
//   } else if (type === 'handleWrite') {
//     this.emit('handleWrite', handle);
//   }
// };


NobleBindings.prototype.startScanning = function(serviceUuids, allowDuplicates) {
  var self = this;
  console.log('startScanning', serviceUuids, allowDuplicates);
  ble.startScan(function(data){
    console.log('scan', data);
    if(data.status === 'scanResult'){
      self._peripherals[data.address] = data;
      self.emit('discover', data.address, {localName:data.name, serviceUuids: serviceUuids}, data.rssi);
    }
  }, function(err){
    console.log('can\'t scan ble', err);
  }, {serviceUuids: serviceUuids});

  this.emit('scanStart');
};

NobleBindings.prototype.stopScanning = function() {
  var self = this;

  ble.stopScan(function(data){
    console.log('stop scan', data);
  }, function(err){
    console.log('can\'t stop scan', err);
  });

  this.emit('scanStop');
};

NobleBindings.prototype.connect = function(deviceUuid) {
  var self = this;
  function onConnect(data){
  	console.log('connect', data);
    if(data.status === 'connected'){
      self.emit('connect', deviceUuid);
    }
  }
  ble.connect(onConnect, function(err){
    ble.reconnect(onConnect, function(){
	    console.log('can\'t connect', err);
    });
  }, {address: deviceUuid});
};

NobleBindings.prototype.disconnect = function(deviceUuid) {
  ble.disconnect(function(data){
    console.log('disconnect', data);
  }, function(err){
    console.log('can\'t disconnect', err);
  });
};

NobleBindings.prototype.updateRssi = function(deviceUuid) {
  //TODO
  console.log('updateRssi', deviceUuid);
};

NobleBindings.prototype.discoverServices = function(deviceUuid, uuids) {

  var self = this;

  if(self.platform && self.platform === 'iOS'){
    //IOS only :(
    ble.services(function(data){
      console.log('discoverServices ble.services', data);
      self.emit('servicesDiscover', deviceUuid, data.serviceUuids);
    }, function(err){
      console.log('can\'t discoverServices ble.services', err);
    }, {'serviceUuids':uuids});
  }else{
    //Android only :(
    ble.discover(function(data){
      console.log('discoverServices ble.discover', data);
      var matchingServices = [];
      if(!Array.isArray(uuids)){
        uuids = [uuids];
      }
			if(uuids.length === 0){
				console.log('No service filter; returning all found');
				data.services.forEach(function(service){
					matchingServices.push(service.serviceUuid);});
			}else{
				uuids.forEach(function(uuid){
					data.services.forEach(function(service){
						console.log('checking', uuid, 'against', service.serviceUuid);
						if(equalUuids(uuid, service.serviceUuid)){
							console.log('match found', uuid);
							matchingServices.push(service.serviceUuid);
						}
					});
				});
			}

      self.emit('servicesDiscover', deviceUuid, matchingServices);
    }, function(err){
      console.log('can\'t discoverServices ble.discover', err);
    }, {address: deviceUuid});
  }


};

NobleBindings.prototype.discoverIncludedServices = function(deviceUuid, serviceUuid, serviceUuids) {
  var peripheral = this._peripherals[deviceUuid];

  //TODO

  // this._sendCommand({
  //   action: 'discoverIncludedServices',
  //   peripheralUuid: peripheral.uuid,
  //   serviceUuid: serviceUuid,
  //   serviceUuids: serviceUuids
  // });
};

NobleBindings.prototype.discoverCharacteristics = function(deviceUuid, serviceUuid, characteristicUuids) {
  var peripheral = this._peripherals[deviceUuid];
  var self = this;

  console.log('discoverCharacteristics', deviceUuid, serviceUuid, characteristicUuids);

  if(self.platform && self.platform === 'iOS'){
    //IOS only :(
    ble.characteristics(function(data){
      console.log('discoverCharacteristics ble.characteristics', data);
      var characteristics = [];
      // Latest version of ble returns different status
      if(data.status && ['discoveredCharacteristics', 'discoverCharacteristics'].indexOf(data.status) > -1){
        characteristics = data.characteristics || data.characteristicUuids || [];
      }else{
        console.log('Incorrect results returned from discoverCharacteristics');
        characteristics = characteristicUuids || [];
      }
      var characteristObjects = [];
      characteristics.forEach(function(characteristic){
      	var uuid;
      	if(typeof characteristic === 'string'){
      		uuid = characteristic;
      	}else{
      		uuid = characteristic.characteristicUuid;
      	}
        characteristObjects.push({ uuid: uuid  });
      });
      self.emit('characteristicsDiscover', deviceUuid, serviceUuid, characteristObjects);
    }, function(err){
      console.log('can\'t discoverCharacteristics ble.characteristics', err);
    }, {'serviceUuid':serviceUuid,'characteristicUuids':characteristicUuids});
  }else{
    //Android hack :(
    ble.discover(function(data){
      console.log('discoverCharacteristics ble.discover', data);
      var matchingChars = [];

      data.services.forEach(function(service){
        if(equalUuids(serviceUuid, service.serviceUuid)){
          console.log('matched service in discoverCharacteristics', serviceUuid);
          if(!Array.isArray(characteristicUuids)){
            characteristicUuids = [characteristicUuids];
          }
          console.log('checking: ' + JSON.stringify(characteristicUuids) + ' against: ' +  JSON.stringify(service.characteristics));
          characteristicUuids.forEach(function(uuid){
            service.characteristics.forEach(function(characteristic){
              console.log('checking characteristicAssignedNumber' + characteristic.characteristicUuid.toLowerCase() + ' :: ' + uuid);
              if(equalUuids(characteristic.characteristicUuid, uuid)){
                matchingChars.push({uuid: characteristic.characteristicUuid});
              }
            });
          });

        }
      });

      console.log('matchingChars: ' + JSON.stringify(matchingChars));
      self.emit('characteristicsDiscover', deviceUuid, serviceUuid, matchingChars);

    }, function(err){
      console.log('can\'t discoverCharacteristics ble.discover', err);
    }, {address: deviceUuid});
  }

};

NobleBindings.prototype.read = function(deviceUuid, serviceUuid, characteristicUuid) {
  var peripheral = this._peripherals[deviceUuid];
  var self = this;

  console.log('read', deviceUuid, serviceUuid, characteristicUuid);

  ble.read(function(resp){
    console.log('read ble.read', resp);
    self.emit('read', deviceUuid, serviceUuid, characteristicUuid, atob(resp.value), false);
  }, function(err){
    console.log('can\'t read ble.read', err);
  }, {"serviceUuid":serviceUuid,"characteristicUuid":characteristicUuid});

};

NobleBindings.prototype.write = function(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse) {
  var peripheral = this._peripherals[deviceUuid];
  var self = this;

  console.log('write', deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse);

  ble.write(function(resp){
    console.log('write ble.write', resp);
    if(!withoutResponse){
      self.emit('write', deviceUuid, serviceUuid, characteristicUuid);
    }
  }, function(err){
    console.log('can\'t write ble.write', err);
  }, {"value":bytesToEncodedString(data),"serviceUuid":serviceUuid,"characteristicUuid":characteristicUuid});

};

NobleBindings.prototype.broadcast = function(deviceUuid, serviceUuid, characteristicUuid, broadcast) {
  var peripheral = this._peripherals[deviceUuid];

  // TODO ? don't see this functionality in the phonegap plugin

  // this._sendCommand({
  //   action: 'broadcast',
  //   peripheralUuid: peripheral.uuid,
  //   serviceUuid: serviceUuid,
  //   characteristicUuid: characteristicUuid,
  //   broadcast: broadcast
  // });
};

NobleBindings.prototype.notify = function(deviceUuid, serviceUuid, characteristicUuid, notify) {
  var peripheral = this._peripherals[deviceUuid];
  var self = this;

  console.log('notify', deviceUuid, serviceUuid, characteristicUuid, notify);
  ble.subscribe(function(data){
    console.log('subscribe', data);
    if(data.status === 'subscribedResult'){
      self.emit('notify', deviceUuid, serviceUuid, characteristicUuid, ble.encodedStringToBytes(data.value));
      self.emit('read', deviceUuid, serviceUuid, characteristicUuid, ble.encodedStringToBytes(data.value), true);
    }
  }, function(err){
    console.log('can\'t notify', err);
  }, {"serviceUuid":serviceUuid,"characteristicUuid":characteristicUuid,"isNotification":true});

};

NobleBindings.prototype.discoverDescriptors = function(deviceUuid, serviceUuid, characteristicUuid) {
  var peripheral = this._peripherals[deviceUuid];

  // this._sendCommand({
  //   action: 'discoverDescriptors',
  //   peripheralUuid: peripheral.uuid,
  //   serviceUuid: serviceUuid,
  //   characteristicUuid: characteristicUuid
  // });
};

NobleBindings.prototype.readValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid) {
  var peripheral = this._peripherals[deviceUuid];

  // this._sendCommand({
  //   action: 'readValue',
  //   peripheralUuid: peripheral.uuid,
  //   serviceUuid: serviceUuid,
  //   characteristicUuid: characteristicUuid,
  //   descriptorUuid: descriptorUuid
  // });
};

NobleBindings.prototype.writeValue = function(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data) {
  var peripheral = this._peripherals[deviceUuid];

  // this._sendCommand({
  //   action: 'writeValue',
  //   peripheralUuid: peripheral.uuid,
  //   serviceUuid: serviceUuid,
  //   characteristicUuid: characteristicUuid,
  //   descriptorUuid: descriptorUuid,
  //   data: data.toString('hex')
  // });
};

NobleBindings.prototype.readHandle = function(deviceUuid, handle) {
  var peripheral = this._peripherals[deviceUuid];

  // this._sendCommand({
  //   action: 'readHandle',
  //   peripheralUuid: peripheral.uuid,
  //   handle: handle
  // });
};

NobleBindings.prototype.writeHandle = function(deviceUuid, handle, data, withoutResponse) {
  var peripheral = this._peripherals[deviceUuid];

  // this._sendCommand({
  //   action: 'readHandle',
  //   peripheralUuid: peripheral.uuid,
  //   handle: handle,
  //   data: data.toString('hex'),
  //   withoutResponse: withoutResponse
  // });
};

var nobleBindings = new NobleBindings();

module.exports = nobleBindings;
