// Thin wrapper around the Colyseus client: connection, room join, input send.
(function () {
  const Net = {
    client: null,
    room: null,
    sessionId: null,
    lastSent: { turn: 0, boost: false, fire: false },

    endpoint() {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      return `${proto}://${location.host}`;
    },

    // code: "PUBLIC" for Quick Play, or a share code for a private room.
    async connect(name, code) {
      this.client = new Colyseus.Client(this.endpoint());
      this.room = await this.client.joinOrCreate("arena", { name, code });
      this.sessionId = this.room.sessionId;
      return this.room;
    },

    // Send input only when it changes, to keep the wire quiet.
    sendInput(turn, boost, fire) {
      if (!this.room) return;
      const l = this.lastSent;
      if (turn === l.turn && boost === l.boost && fire === l.fire) return;
      this.lastSent = { turn, boost, fire };
      this.room.send("input", { turn, boost, fire });
    },

    setName(name) {
      if (this.room) this.room.send("setName", name);
    },

    leave() {
      if (this.room) { try { this.room.leave(); } catch (e) {} this.room = null; }
    },
  };

  window.Net = Net;
})();
