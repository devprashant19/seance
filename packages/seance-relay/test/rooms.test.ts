import { describe, expect, it, vi, beforeEach } from "vitest";
import { RoomManager } from "../src/rooms.js";

describe("RoomManager", () => {
  let mgr: RoomManager;

  beforeEach(() => {
    mgr = new RoomManager();
  });

  describe("generateCode", () => {
    it("produces 4-character codes from the allowed alphabet", () => {
      const code = mgr.generateCode();
      expect(code).toHaveLength(4);
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
    });

    it("generates unique codes", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const room = mgr.createRoom();
        expect(codes.has(room.code)).toBe(false);
        codes.add(room.code);
      }
    });
  });

  describe("createRoom", () => {
    it("creates a room with host connected", () => {
      const room = mgr.createRoom();
      expect(room.hostConnected).toBe(true);
      expect(room.hostDisconnectedAt).toBeUndefined();
      expect(room.peers.size).toBe(0);
      expect(mgr.roomCount).toBe(1);
    });

    it("stores observer key", () => {
      const room = mgr.createRoom("secret123");
      expect(room.observerKey).toBe("secret123");
    });
  });

  describe("peers", () => {
    it("adds peers up to capacity (8)", () => {
      const room = mgr.createRoom();
      for (let i = 0; i < 8; i++) {
        const peer = mgr.addPeer(room, ["accel"]);
        expect(peer.peerId).toBeTruthy();
        expect(peer.connected).toBe(true);
        expect(peer.capabilities).toEqual(["accel"]);
      }
      expect(room.peers.size).toBe(8);
    });

    it("throws when room is full", () => {
      const room = mgr.createRoom();
      for (let i = 0; i < 8; i++) mgr.addPeer(room, []);
      expect(() => mgr.addPeer(room, [])).toThrow("Room is full");
    });

    it("disconnects and removes peers", () => {
      const room = mgr.createRoom();
      const peer = mgr.addPeer(room, []);
      mgr.disconnectPeer(room, peer.peerId);
      expect(peer.connected).toBe(false);
      expect(peer.disconnectedAt).toBeTypeOf("number");

      mgr.removePeer(room, peer.peerId);
      expect(room.peers.size).toBe(0);
    });
  });

  describe("resume token", () => {
    it("finds peer by resume token within window", () => {
      const room = mgr.createRoom();
      const peer = mgr.addPeer(room, ["gyro"]);
      mgr.disconnectPeer(room, peer.peerId);

      const found = mgr.findByResumeToken(room, peer.resumeToken);
      expect(found).toBeDefined();
      expect(found!.peerId).toBe(peer.peerId);
    });

    it("returns undefined for connected peer", () => {
      const room = mgr.createRoom();
      const peer = mgr.addPeer(room, []);
      const found = mgr.findByResumeToken(room, peer.resumeToken);
      expect(found).toBeUndefined();
    });

    it("returns undefined for expired token", () => {
      const room = mgr.createRoom();
      const peer = mgr.addPeer(room, []);
      mgr.disconnectPeer(room, peer.peerId);

      vi.useFakeTimers();
      vi.advanceTimersByTime(3 * 60 * 1000);
      const found = mgr.findByResumeToken(room, peer.resumeToken);
      expect(found).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe("host disconnect/reconnect", () => {
    it("tracks host disconnect", () => {
      const room = mgr.createRoom();
      mgr.disconnectHost(room);
      expect(room.hostConnected).toBe(false);
      expect(room.hostDisconnectedAt).toBeTypeOf("number");
    });

    it("reconnects host", () => {
      const room = mgr.createRoom();
      mgr.disconnectHost(room);
      mgr.reconnectHost(room);
      expect(room.hostConnected).toBe(true);
      expect(room.hostDisconnectedAt).toBeUndefined();
    });
  });

  describe("pruneExpired", () => {
    it("removes rooms after 4-hour hard expiry", () => {
      vi.useFakeTimers();
      const room = mgr.createRoom();
      expect(mgr.roomCount).toBe(1);

      vi.advanceTimersByTime(4 * 60 * 60 * 1000 + 1);
      const removed = mgr.pruneExpired();
      expect(removed).toContain(room.code);
      expect(mgr.roomCount).toBe(0);
      vi.useRealTimers();
    });

    it("removes rooms after 10-minute host grace period", () => {
      vi.useFakeTimers();
      const room = mgr.createRoom();
      mgr.disconnectHost(room);

      vi.advanceTimersByTime(10 * 60 * 1000 + 1);
      const removed = mgr.pruneExpired();
      expect(removed).toContain(room.code);
      expect(mgr.roomCount).toBe(0);
      vi.useRealTimers();
    });

    it("prunes disconnected peers past resume window", () => {
      vi.useFakeTimers();
      const room = mgr.createRoom();
      const peer = mgr.addPeer(room, []);
      mgr.disconnectPeer(room, peer.peerId);

      vi.advanceTimersByTime(2 * 60 * 1000 + 1);
      mgr.pruneExpired();
      expect(room.peers.size).toBe(0);
      vi.useRealTimers();
    });
  });
});
