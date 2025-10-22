import React, { useEffect, useRef } from 'react';

// Access the global THREE object attached to the window by the script tag in index.html
const THREE = (window as any).THREE;

interface AudioVisualizerProps {
  audioContext: AudioContext;
  audioNode: GainNode;
  isSpeaking: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioContext, audioNode, isSpeaking }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  // FIX: Initialize useRef with null and update the type to allow null.
  // This resolves the error "Expected 1 arguments, but got 0" because useRef<number>()
  // cannot be initialized with an implicit undefined value.
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Ensure THREE is loaded and all required props are available
    if (!THREE || !mountRef.current || !audioContext || !audioNode) return;

    const currentMount = mountRef.current;
    let isCleanedUp = false;

    // --- Three.js Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // --- Web Audio API Analyser ---
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64; // Use a smaller FFT size for simpler, more responsive data
    audioNode.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // --- 3D Object (Pulsating Orb) ---
    const geometry = new THREE.IcosahedronGeometry(1, 5); // A detailed sphere-like shape
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ffff, // Cyan color
      emissive: 0x00aaff, // Blueish glow
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.7,
      wireframe: true,
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00ffff, 1.5, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    const animate = () => {
      if (isCleanedUp) return;
      animationFrameId.current = requestAnimationFrame(animate);

      // Get audio frequency data
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

      // Calculate scale based on audio intensity
      const pulseAmount = (average / 128) * 0.5; // Normalized and scaled
      const targetScale = isSpeaking ? 1 + pulseAmount : 1;

      // Smoothly interpolate to the target scale for a fluid animation
      const lerpFactor = 0.1;
      const newScale = THREE.MathUtils.lerp(sphere.scale.x, targetScale, lerpFactor);
      sphere.scale.set(newScale, newScale, newScale);

      // Gentle rotation
      const elapsedTime = clock.getElapsedTime();
      sphere.rotation.y = elapsedTime * 0.1;
      sphere.rotation.x = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    // --- Event Handlers & Cleanup ---
    const handleResize = () => {
      if (!currentMount || isCleanedUp) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isCleanedUp = true;
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // Safely remove the renderer's canvas and dispose of Three.js objects
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      try {
        // Disconnect the analyser node to prevent audio processing leaks
        audioNode.disconnect(analyser);
      } catch (e) {
        // Ignore error if it's already disconnected
      }
    };
  }, [audioContext, audioNode, isSpeaking]);

  return <div ref={mountRef} className={`w-full h-full transition-opacity duration-500 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`} />;
};

export default AudioVisualizer;