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

  // Orbit angle (horizontal azimuth)
  const orbitAngle = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const previousMouseX = useRef<number>(0);

  // Current camera world position held in ref for smooth spring damping
  const currentPos = useRef(new THREE.Vector3(
    targetPosition[0],
    targetPosition[1] + CAMERA_CONFIG.height,
    targetPosition[2] + CAMERA_CONFIG.distance
  ));

  useEffect(() => {
    const domElement = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      // Left mouse click drag
      if (e.button === 0) {
        isDragging.current = true;
        previousMouseX.current = e.clientX;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMouseX.current;
      previousMouseX.current = e.clientX;
      orbitAngle.current -= deltaX * CAMERA_CONFIG.orbitSpeed;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

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

    // Compute ideal camera position based on player position and orbit angle
    const targetX = targetPosition[0] + Math.sin(orbitAngle.current) * CAMERA_CONFIG.distance;
    const targetY = targetPosition[1] + CAMERA_CONFIG.height;
    const targetZ = targetPosition[2] + Math.cos(orbitAngle.current) * CAMERA_CONFIG.distance;

    const lerpRate = reducedMotion ? 8.0 : CAMERA_CONFIG.damping;
    currentPos.current.x += (targetX - currentPos.current.x) * Math.min(dt * lerpRate, 1);
    currentPos.current.y += (targetY - currentPos.current.y) * Math.min(dt * lerpRate, 1);
    currentPos.current.z += (targetZ - currentPos.current.z) * Math.min(dt * lerpRate, 1);

    camera.position.copy(currentPos.current);

    // Look at player center
    const lookTarget = new THREE.Vector3(
      targetPosition[0],
      targetPosition[1] + CAMERA_CONFIG.lookAtHeight,
      targetPosition[2]
    );
    camera.lookAt(lookTarget);
  });

  return null;
}
