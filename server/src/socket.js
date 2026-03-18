let _io = null;

function setIo(io) {
  _io = io;
}

// Broadcast a change to every connected client in the same family
function broadcast(familyId, event, data) {
  if (_io) _io.to(`family:${familyId}`).emit(event, data);
}

module.exports = { setIo, broadcast };
