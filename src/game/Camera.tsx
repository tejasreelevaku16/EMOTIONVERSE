import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../hooks/useGameStore';

interface CameraProps {
  targetPosition: [number, number, number];
}

const CAMERA_CONFIG = {
  distance: 5.6,
  height: 2.8,
  lookAtHeight: 1.1,
  damping: 4.5,
  orbitSpeed: 0.003,
};

export function Camera({ targetPosition }: CameraProps) {
  const { camera, gl } = useThree();
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);
  const cameraMode = useGameStore((state) => state.cameraMode);

  const orbitAngle = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const previousMouseX = useRef<number>(0);
  const pushInProgress = useRef<number>(0);

  const currentPos = useRef(new THREE.Vector3(
    targetPosition[0],
    targetPosition[1] + CAMERA_CONFIG.height,
    targetPosition[2] + CAMERA_CONFIG.distance
  ));

  useEffect(() => {
    const domElement = gl.domElement;
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { isDragging.current = true; previousMouseX.current = e.clientX; }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMouseX.current;
      previousMouseX.current = e.clientX;
      orbitAngle.current -= deltaX * CAMERA_CONFIG.orbitSpeed;
    };
    const handleMouseUp = () => { isDragging.current = false; };
    domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gl.domElement]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Target camera config based on mode
    let targetDist = CAMERA_CONFIG.distance;
    let targetHeight = CAMERA_CONFIG.height;
    let targetLookH = CAMERA_CONFIG.lookAtHeight;

    if (cameraMode === 'pushIn') {
      targetDist = 3.2;
      targetHeight = 1.9;
      targetLookH = 1.4;
    } else if (cameraMode === 'hold') {
      targetDist = 4.0;
      targetHeight = 2.4;
      targetLookH = 1.2;
    }

    // Smooth mode transition using smoothstep
    pushInProgress.current += (cameraMode !== 'follow' ? 1 : -1) * dt * 2.5;
    pushInProgress.current = Math.max(0, Math.min(1, pushInProgress.current));
    const t = pushInProgress.current;
    const eased = t * t * (3 - 2 * t);

    const dist = CAMERA_CONFIG.distance + (targetDist - CAMERA_CONFIG.distance) * eased;
    const height = CAMERA_CONFIG.height + (targetHeight - CAMERA_CONFIG.height) * eased;
    const lookH = CAMERA_CONFIG.lookAtHeight + (targetLookH - CAMERA_CONFIG.lookAtHeight) * eased;

    const targetX = targetPosition[0] + Math.sin(orbitAngle.current) * dist;
    const targetY = targetPosition[1] + height;
    const targetZ = targetPosition[2] + Math.cos(orbitAngle.current) * dist;

    const lerpRate = reducedMotion ? 8.0 : CAMERA_CONFIG.damping;
    currentPos.current.x += (targetX - currentPos.current.x) * Math.min(dt * lerpRate, 1);
    currentPos.current.y += (targetY - currentPos.current.y) * Math.min(dt * lerpRate, 1);
    currentPos.current.z += (targetZ - currentPos.current.z) * Math.min(dt * lerpRate, 1);

    camera.position.copy(currentPos.current);

    const lookTarget = new THREE.Vector3(
      targetPosition[0],
      targetPosition[1] + lookH,
      targetPosition[2]
    );
    camera.lookAt(lookTarget);
  });

  return null;
}