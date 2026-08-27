import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { chronocordSettingsCenter } from './build/chronocord-settings-transform.mjs';
import { chronocordProductFeatures } from './build/chronocord-product-transform.mjs';
import { chronocordFeatureInteractions } from './build/chronocord-feature-transform.mjs';

function chronocordWebRtcFix() {
  return {
    name: 'chronocord-webrtc-screen-share-fix',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/ChronoCord.jsx') && !id.endsWith('\\src\\ChronoCord.jsx')) return null;

      let output = code.replace(/\r\n/g, '\n');
      let changed = output !== code;

      const signalMarker = "if(data.type==='offer'){";
      const signalReplacement = `if(data.type==='renegotiate-request'){
      if(String(authUser.id)<String(from)){
        try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);socketRef.current?.emit("webrtc-signal",{to:from,data:{type:"offer",sdp:offer}});}catch{}
      }
      return;
    } else if(data.type==='offer'){`;
      if (output.includes(signalMarker) && !output.includes("data.type==='renegotiate-request'")) {
        output = output.replace(signalMarker, signalReplacement);
        changed = true;
      }

      const oldRenegotiate = `async function renegotiatePeers(){
    for(const [peerId,pc] of peerConnectionsRef.current){
      if(String(authUser.id)<String(peerId)){ try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);socketRef.current?.emit("webrtc-signal",{to:peerId,data:{type:"offer",sdp:offer}});}catch{} }
    }
  }`;
      const newRenegotiate = `async function renegotiatePeers(){
    for(const [peerId,pc] of peerConnectionsRef.current){
      try{
        if(String(authUser.id)<String(peerId)){
          const offer=await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("webrtc-signal",{to:peerId,data:{type:"offer",sdp:offer}});
        } else {
          socketRef.current?.emit("webrtc-signal",{to:peerId,data:{type:"renegotiate-request"}});
        }
      }catch{}
    }
  }`;
      if (output.includes(oldRenegotiate)) {
        output = output.replace(oldRenegotiate, newRenegotiate);
        changed = true;
      }

      const oldPreview = `{voiceCameraOn && <video ref={localVideoRef}`;
      const newPreview = `{(voiceCameraOn || voiceScreenSharing) && <video ref={localVideoRef}`;
      if (output.includes(oldPreview)) {
        output = output.replace(oldPreview, newPreview);
        changed = true;
      }

      if (!changed) {
        throw new Error('ChronoCord WebRTC fix: expected source markers were not found; refusing to build an unpatched screen-share bundle.');
      }
      return { code: output, map: null };
    },
  };
}

export default defineConfig({
  plugins: [chronocordWebRtcFix(), chronocordSettingsCenter(), chronocordProductFeatures(), chronocordFeatureInteractions(), react()],
  base: './',
  build: { target: 'es2020' },
});
