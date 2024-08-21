class MainRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.peers = new Map();
    this.breakoutRooms = new Map();
  }

  addPeer(peerId, peer) {
    this.peers.set(peerId, peer);
  }

  removePeer(peerId) {
    this.peers.delete(peerId);
  }
}

export { MainRoom };
