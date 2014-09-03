'use strict';

var events = require('events');
var util = require('util');

var debug = require('debug')('bindings');

var ble = window.bluetoothle;


//included in newer bluetoothLE
function bytesToEncodedString(bytes) {
  return btoa(String.fromCharCode.apply(null, bytes));
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
    console.log('cant initialize ble', err);
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
    console.log('cant scan ble', err);
  }, {serviceUuids: serviceUuids});

  this.emit('scanStart');
};

NobleBindings.prototype.stopScanning = function() {
  var self = this;

  ble.stopScan(function(data){
    console.log('stop scan', data);
  }, function(err){
    console.log('cant stop scan', err);
  });

  this.emit('scanStop');
};

NobleBindings.prototype.connect = function(deviceUuid) {
  var self = this;
  ble.connect(function(data){
    console.log('connect', data);
    if(data.status === 'connected'){
      self.emit('connect', deviceUuid);
    }
  }, function(err){
    console.log('cant connect', err);
  }, {address: deviceUuid});
};

NobleBindings.prototype.disconnect = function(deviceUuid) {
  ble.disconnect(function(data){
    console.log('disconnect', data);
  }, function(err){
    console.log('cant disconnect', err);
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
      console.log('cant discoverServices ble.services', err);
    }, {'serviceUuids':uuids});
  }else{
    //Android only :(
    ble.discover(function(data){
      console.log('discoverServices ble.discover', data);
      var matchingServices = [];
      if(!Array.isArray(uuids)){
        uuids = [uuids];
      }
      uuids.forEach(function(uuid){
        var checkUuid = uuid;
        if(checkUuid.length > 4){
          checkUuid = checkUuid.substring(4,8);
        }
        checkUuid = checkUuid.toLowerCase().split('-').join('');
        data.services.forEach(function(service){
          var serviceUuid = service.serviceUuid.toLowerCase().split('-').join('');
          if(serviceUuid === checkUuid){
            matchingServices.push(serviceUuid);
          }
        });
      });

      self.emit('servicesDiscover', deviceUuid, matchingServices);
    }, function(err){
      console.log('cant discoverServices ble.discover', err);
    });
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

  //IOS only :(
  ble.characteristics(function(data){
    console.log('discoverCharacteristics ble.characteristics', data);
    if(data.status && data.status === "discoverCharacteristics"){
      self.emit('characteristicsDiscover', deviceUuid, serviceUuid, data.characteristicUuids);
    }
  }, function(err){
    console.log('cant discoverCharacteristics ble.characteristics', err);
  }, {"serviceUuid":serviceUuid,"characteristicUuids":characteristicUuids});

  //Android hack :(
  ble.discover(function(data){
    console.log('discoverCharacteristics ble.discover', data);
    var matchingChars = [];

    data.services.forEach(function(service){
      var checkServiceUuid = serviceUuid;
      if(checkServiceUuid.length > 7){
        checkServiceUuid = checkServiceUuid.substring(4,8);
      }
      checkServiceUuid = checkServiceUuid.toLowerCase().split('-').join('');
      var serviceUuidClean = service.serviceUuid.toLowerCase().split('-').join('');
      if(serviceUuidClean == checkServiceUuid){
        console.log('matched service in discoverCharacteristics');
        if(!Array.isArray(characteristicUuids)){
          characteristicUuids = [characteristicUuids];
        }
        console.log('checking', characteristicUuids, 'against', service.characteristics);
        characteristicUuids.forEach(function(uuid){
          var checkUuid = uuid;
          if(checkUuid.length > 7){
            checkUuid = checkUuid.substring(4,8);
          }
          checkUuid = checkUuid.toLowerCase();
          service.characteristics.forEach(function(characteristic){
            console.log('checking characteristicAssignedNumber', characteristic.characteristicUuid.toLowerCase(), checkUuid);
            if(characteristic.characteristicUuid.toLowerCase() == checkUuid){
              matchingChars.push({uuid: characteristic.characteristicUuid});
            }
          });
        });

      }
    });

    console.log('matchingChars', matchingChars);
    self.emit('characteristicsDiscover', deviceUuid, serviceUuid, matchingChars);

  }, function(err){
    console.log('cant discoverCharacteristics ble.discover', err);
  });


};

NobleBindings.prototype.read = function(deviceUuid, serviceUuid, characteristicUuid) {
  var peripheral = this._peripherals[deviceUuid];
  var self = this;

  console.log('read', deviceUuid, serviceUuid, characteristicUuid);

  ble.read(function(resp){
    console.log('read ble.read', resp);
    self.emit('read', deviceUuid, serviceUuid, characteristicUuid, atob(resp.value), false);
  }, function(err){
    console.log('cant read ble.read', err);
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
    console.log('cant write ble.write', err);
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
    console.log('cant notify', err);
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
