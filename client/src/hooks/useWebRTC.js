import { useRef, useCallback } from 'react';

// Free STUN servers from Google for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC({ socketRef, localStreamRef, onRemoteStream, onCallEnded }) {
  const pcRef = useRef(null);

  // ── Create a new RTCPeerConnection ──────────────────────────────────────
  const createPeerConnection = useCallback((targetEmail) => {
    // Close any existing connection
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Send ICE candidates to remote peer via signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          targetEmail,
          candidate: event.candidate,
        });
      }
    };

    // Receive remote media tracks
    pc.ontrack = (event) => {
      if (onRemoteStream) {
        onRemoteStream(event.streams[0]);
      }
    };

    // Connection state logging
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        if (onCallEnded) onCallEnded();
      }
    };

    // Add local tracks to the peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  }, [socketRef, localStreamRef, onRemoteStream, onCallEnded]);

  // ── Caller: create and send offer ───────────────────────────────────────
  const createOffer = useCallback(async (targetEmail) => {
    const pc = createPeerConnection(targetEmail);

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);

    socketRef.current?.emit('webrtc-offer', { targetEmail, offer });
    return pc;
  }, [createPeerConnection, socketRef]);

  // ── Callee: receive offer, create and send answer ────────────────────────
  const handleOffer = useCallback(async (offer, targetEmail) => {
    const pc = createPeerConnection(targetEmail);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current?.emit('webrtc-answer', { targetEmail, answer });
    return pc;
  }, [createPeerConnection, socketRef]);

  // ── Handle received answer ───────────────────────────────────────────────
  const handleAnswer = useCallback(async (answer) => {
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  // ── Handle received ICE candidate ────────────────────────────────────────
  const handleIceCandidate = useCallback(async (candidate) => {
    if (pcRef.current && candidate) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[ICE] Failed to add candidate:', err);
      }
    }
  }, []);

  // ── Close the peer connection ────────────────────────────────────────────
  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  // ── Replace video track (when toggling camera) ───────────────────────────
  const replaceVideoTrack = useCallback(async (newStream) => {
    const pc = pcRef.current;
    if (!pc) return;
    const newVideoTrack = newStream?.getVideoTracks()[0];
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
    if (sender && newVideoTrack) {
      await sender.replaceTrack(newVideoTrack);
    }
  }, []);

  return {
    pcRef,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    closePeerConnection,
    replaceVideoTrack,
  };
}
