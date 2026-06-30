import { useRef, useState, useCallback } from 'react';

export function useRecording() {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);

  // ── Start recording combined local + remote streams ─────────────────────
  const startRecording = useCallback((localStream, remoteStream) => {
    if (!localStream && !remoteStream) return;

    try {
      const tracks = [];

      // Mix audio from both local and remote streams
      const audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();

      if (localStream?.getAudioTracks().length > 0) {
        const localSource = audioContext.createMediaStreamSource(localStream);
        localSource.connect(dest);
      }
      if (remoteStream?.getAudioTracks().length > 0) {
        const remoteSource = audioContext.createMediaStreamSource(remoteStream);
        remoteSource.connect(dest);
      }

      // Add mixed audio track
      dest.stream.getAudioTracks().forEach(t => tracks.push(t));

      // Add video track from remote stream (if available)
      if (remoteStream?.getVideoTracks().length > 0) {
        remoteStream.getVideoTracks().forEach(t => tracks.push(t));
      } else if (localStream?.getVideoTracks().length > 0) {
        // Voice-only: record local video as fallback
        localStream.getVideoTracks().forEach(t => tracks.push(t));
      }

      const combinedStream = new MediaStream(tracks);

      // Determine supported MIME type
      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'audio/webm',
      ].find(type => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'video/webm',
        });

        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `IJAZ-Call-${timestamp}.webm`;

        // Auto-download to local device
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        // Keep in-app recording history
        setRecordings(prev => [
          {
            id: timestamp,
            filename,
            url,
            blob,
            size: blob.size,
            duration: null,
            date: new Date(),
          },
          ...prev,
        ]);

        chunksRef.current = [];
        setIsRecording(false);

        // Clean up AudioContext
        try { audioContext.close(); } catch (_) {}
      };

      recorder.start(1000); // collect data every 1 second
      setIsRecording(true);
      console.log('[Recording] Started');
    } catch (err) {
      console.error('[Recording] Failed to start:', err);
    }
  }, []);

  // ── Stop recording ───────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log('[Recording] Stopped');
    }
  }, []);

  // ── Delete a recording from history ─────────────────────────────────────
  const deleteRecording = useCallback((id) => {
    setRecordings(prev => {
      const rec = prev.find(r => r.id === id);
      if (rec?.url) URL.revokeObjectURL(rec.url);
      return prev.filter(r => r.id !== id);
    });
  }, []);

  // ── Format file size ─────────────────────────────────────────────────────
  const formatSize = useCallback((bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  return {
    isRecording,
    recordings,
    startRecording,
    stopRecording,
    deleteRecording,
    formatSize,
  };
}
