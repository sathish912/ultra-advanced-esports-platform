import React, { useState, useEffect } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import api from '../api';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export default function VoiceChannel({ channelName, onClose }) {
  const [joined, setJoined] = useState(false);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let track = null;

    const initAgora = async () => {
      try {
        const res = await api.get(`/voice/token?channelName=${channelName}`);
        const { token, uid, appId } = res.data;

        await client.join(appId, channelName, token, uid);
        setJoined(true);

        track = await AgoraRTC.createMicrophoneAudioTrack();
        setLocalAudioTrack(track);
        await client.publish([track]);

        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio") {
            const remoteAudioTrack = user.audioTrack;
            remoteAudioTrack.play();
            setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
          }
        });

        client.on("user-unpublished", (user) => {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

        client.on("user-left", (user) => {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });

      } catch (err) {
        console.error("Agora init failed:", err);
        toast.error("Failed to join voice channel.");
      }
    };

    initAgora();

    return () => {
      if (track) {
        track.stop();
        track.close();
      }
      client.removeAllListeners();
      client.leave();
    };
  }, [channelName]);

  const toggleMute = () => {
    if (localAudioTrack) {
      localAudioTrack.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 bg-surface border border-white/10 rounded-2xl p-4 w-72 shadow-2xl z-50 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Volume2 size={16} className="text-accent" />
          {channelName.replace(/_/g, ' ')}
        </h3>
        <button onClick={onClose} className="text-textMuted hover:text-white transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-primary/20 text-primary border-2 ${!isMuted ? 'border-primary animate-pulse' : 'border-transparent'}`}>
            Me
          </div>
          <span className="text-sm text-white flex-1">You</span>
        </div>
        
        {remoteUsers.map(user => (
          <div key={user.uid} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-accent/20 text-accent border-2 border-accent animate-pulse">
              U
            </div>
            <span className="text-sm text-textMuted flex-1">User {user.uid}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={toggleMute}
          className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/40' : 'bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30'
          }`}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </div>
  );
}
