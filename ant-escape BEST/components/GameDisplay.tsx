
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Stars, Sparkles, Sky, Billboard, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Position, Entity, BossType } from '../types';

interface GameDisplayProps {
  gameState: GameState;
}

// --- 3D COMPONENTS ---

const FloorTile: React.FC<{ position: [number, number, number], visible: boolean, seen: boolean }> = ({ position, visible, seen }) => {
  if (!seen) return null;
  return (
    <mesh position={[position[0] + 0.5, -0.1, position[2] + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color={visible ? "#5d4037" : "#3e2723"} roughness={0.9} />
    </mesh>
  );
};

const CeilingTile: React.FC<{ position: [number, number, number], visible: boolean, seen: boolean }> = ({ position, visible, seen }) => {
  if (!seen) return null;
  return (
    <mesh position={[position[0] + 0.5, 1.8, position[2] + 0.5]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color="#271c19" roughness={1} />
    </mesh>
  );
};

const WallBlock: React.FC<{ position: [number, number, number], visible: boolean, seen: boolean }> = ({ position, visible, seen }) => {
  if (!seen) return null;
  const height = 2.2;
  const color = visible ? "#4e342e" : "#271c19"; 
  
  return (
    <mesh position={[position[0] + 0.5, height / 2 - 0.1, position[2] + 0.5]}>
      <boxGeometry args={[1, height, 1]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
};

// --- DECORATIONS ---

const MushroomDecoration: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
        <group position={[position[0] + 0.5, 0, position[2] + 0.5]}>
            <pointLight distance={1.5} intensity={0.8} color="#00e676" decay={2} />
            <group scale={[0.5, 0.5, 0.5]} position={[0.2, 0, 0.1]}>
                <mesh position={[0, 0.15, 0]}>
                    <cylinderGeometry args={[0.02, 0.03, 0.3]} />
                    <meshStandardMaterial color="#fff" />
                </mesh>
                <mesh position={[0, 0.3, 0]}>
                    <sphereGeometry args={[0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color="#00e676" emissive="#00e676" emissiveIntensity={0.6} />
                </mesh>
            </group>
        </group>
    );
};

const PuddleDecoration: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
         <mesh position={[position[0] + 0.5, -0.09, position[2] + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.35, 16]} />
            <meshStandardMaterial color="#0288d1" roughness={0.1} metalness={0.8} transparent opacity={0.6} />
        </mesh>
    );
};

const PebbleDecoration: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
        <group position={[position[0] + 0.5, 0, position[2] + 0.5]}>
             <mesh position={[0.1, 0.05, 0.2]} rotation={[0.5, 0.5, 0]}>
                <dodecahedronGeometry args={[0.08, 0]} />
                <meshStandardMaterial color="#757575" />
            </mesh>
        </group>
    );
};

const CrystalDecoration: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
        <group position={[position[0] + 0.5, 0, position[2] + 0.5]}>
            <pointLight distance={2} intensity={0.5} color="#e040fb" decay={2} />
             <mesh position={[0, 0.2, 0]} rotation={[0, Math.PI/4, 0]}>
                <coneGeometry args={[0.1, 0.4, 4]} />
                <meshStandardMaterial color="#e040fb" emissive="#e040fb" emissiveIntensity={0.5} transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

// --- ENTITIES ---

const PlayerModel: React.FC<{ entity: Entity }> = ({ entity }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Create a target object that will be parented to the player group.
  // This ensures the light always points "forward" relative to the player model (Local Z+).
  const lightTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 5); 
    return obj;
  }, []);
  
  useFrame((state) => {
    if (meshRef.current) {
        const targetX = entity.pos.x;
        const targetZ = entity.pos.y;
        meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.3);
        meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.3);
        
        const targetRot = (entity.angle || 0) * -1 + Math.PI / 2;
        let currentRot = meshRef.current.rotation.y;
        let diff = targetRot - currentRot;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        meshRef.current.rotation.y = THREE.MathUtils.lerp(currentRot, currentRot + diff, 0.3);
        
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 10) * 0.02 + 0.15;
    }
  });

  return (
    <group ref={meshRef}>
        {/* Add target to scene graph as child of player so it rotates with player */}
        <primitive object={lightTarget} />

        <spotLight 
            position={[0, 0.4, 0]} 
            angle={0.65} 
            penumbra={0.3} 
            intensity={4} 
            distance={14} 
            castShadow 
            target={lightTarget}
        />
        {/* Fill light around player so they aren't totally blind in near darkness */}
        <pointLight position={[0, 0.5, 0]} intensity={0.5} distance={5} color="#fff" />
    </group>
  );
};

const HealthBar: React.FC<{ hp: number, maxHp: number }> = ({ hp, maxHp }) => {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  // Color transition: Green -> Yellow -> Red
  const color = ratio > 0.6 ? '#76ff03' : ratio > 0.3 ? '#ffea00' : '#f50057';
  
  if (ratio <= 0) return null;

  return (
    <Billboard position={[0, 1.4, 0]}>
         <group>
            {/* Background/Border */}
            <mesh position={[0, 0, -0.02]}>
                <planeGeometry args={[1.08, 0.18]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.6} />
            </mesh>
             {/* Inner Background */}
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.0, 0.12]} />
                <meshBasicMaterial color="#212121" />
            </mesh>
            {/* Health Bar */}
            <mesh position={[(-1 + ratio) * 0.5, 0, 0]}>
                <planeGeometry args={[ratio, 0.12]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
         </group>
    </Billboard>
  );
};

const getStableRandom = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash << 5) - hash + id.charCodeAt(i);
        hash |= 0; 
    }
    return Math.abs(hash);
};

const EnemyModel: React.FC<{ entity: Entity, playerPos: Position }> = ({ entity, playerPos }) => {
  const meshRef = useRef<THREE.Group>(null);
  const animRef = useRef<THREE.Group>(null);
  const randomOffset = useMemo(() => getStableRandom(entity.id || '0'), [entity.id]);
  
  const colorMap: Record<string, string> = {
    'text-gray-900': '#424242', 
    'text-red-700': '#d32f2f', 
    'text-red-900': '#b71c1c', 
    'text-green-900': '#1b5e20', 
    'text-lime-800': '#827717', 
    'text-gray-400': '#bdbdbd', 
    'text-yellow-600': '#f57f17', 
    'text-green-500': '#2e7d32', 
  };
  const color = colorMap[entity.color] || '#ff5252';

  useFrame((state) => {
    if (meshRef.current) {
        meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, entity.pos.x, 0.1);
        meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, entity.pos.y, 0.1);
        meshRef.current.lookAt(playerPos.x, 0, playerPos.y);
    }

    if (animRef.current) {
        if (entity.attackCooldown && entity.attackCooldown > 45) {
            const lungeProgress = (60 - entity.attackCooldown) / 15;
            const forwardAmt = Math.sin(lungeProgress * Math.PI) * 0.8;
            animRef.current.position.z = forwardAmt;
            animRef.current.position.y = Math.sin(lungeProgress * Math.PI) * 0.3 + 0.25; 
            animRef.current.rotation.x = -Math.sin(lungeProgress * Math.PI) * 0.2;
        } else {
             animRef.current.position.z = THREE.MathUtils.lerp(animRef.current.position.z, 0, 0.1);
             animRef.current.position.y = Math.sin(state.clock.elapsedTime * 3 + randomOffset) * 0.05 + 0.25; 
             animRef.current.rotation.x = 0;
        }
    }
  });

  const renderBoss = () => {
    if (entity.bossType === 'RHINO') {
        return (
            <group scale={1.8}>
                <pointLight distance={4} decay={2} intensity={2} color="#ff0000" />
                {/* Armored Body */}
                <mesh position={[0, 0.4, 0]}>
                    <boxGeometry args={[0.7, 0.6, 0.9]} />
                    <meshStandardMaterial color="#546e7a" roughness={0.3} metalness={0.6} />
                </mesh>
                {/* Neck/Head Connector */}
                <mesh position={[0, 0.5, 0.5]}>
                    <boxGeometry args={[0.5, 0.5, 0.4]} />
                    <meshStandardMaterial color="#455a64" roughness={0.3} metalness={0.6} />
                </mesh>
                {/* Giant Horn */}
                <mesh position={[0, 0.8, 0.65]} rotation={[Math.PI/4, 0, 0]}>
                    <coneGeometry args={[0.15, 0.8, 8]} />
                    <meshStandardMaterial color="#cfd8dc" roughness={0.2} metalness={0.8} />
                </mesh>
                {/* Glowing Eyes */}
                <mesh position={[0.15, 0.6, 0.7]}>
                    <boxGeometry args={[0.1, 0.05, 0.05]} />
                    <meshStandardMaterial color="#ff1744" emissive="#ff0000" emissiveIntensity={3} />
                </mesh>
                <mesh position={[-0.15, 0.6, 0.7]}>
                    <boxGeometry args={[0.1, 0.05, 0.05]} />
                    <meshStandardMaterial color="#ff1744" emissive="#ff0000" emissiveIntensity={3} />
                </mesh>
                 {/* Legs */}
                {[1, -1].map((side, i) => (
                    <React.Fragment key={i}>
                         <mesh position={[side * 0.4, 0.1, 0.3]}>
                            <cylinderGeometry args={[0.1, 0.1, 0.4]} />
                            <meshStandardMaterial color="#37474f" />
                         </mesh>
                         <mesh position={[side * 0.4, 0.1, -0.3]}>
                            <cylinderGeometry args={[0.1, 0.1, 0.4]} />
                            <meshStandardMaterial color="#37474f" />
                         </mesh>
                    </React.Fragment>
                ))}
            </group>
        );
    } 
    if (entity.bossType === 'MANTIS') {
         return (
             <group scale={1.5}>
                <pointLight distance={4} decay={2} intensity={2} color="#00ff00" />
                {/* Vertical Body */}
                <mesh position={[0, 0.6, 0]} rotation={[Math.PI/6, 0, 0]}>
                    <capsuleGeometry args={[0.15, 1.2]} />
                    <meshStandardMaterial color="#2e7d32" roughness={0.4} />
                </mesh>
                {/* Head */}
                <mesh position={[0, 1.2, 0.3]}>
                    <coneGeometry args={[0.15, 0.4, 4]} />
                    <meshStandardMaterial color="#1b5e20" />
                </mesh>
                {/* Eyes */}
                <mesh position={[0.1, 1.2, 0.4]}>
                    <sphereGeometry args={[0.05]} />
                    <meshStandardMaterial color="#b2ff59" emissive="#76ff03" emissiveIntensity={2} />
                </mesh>
                <mesh position={[-0.1, 1.2, 0.4]}>
                    <sphereGeometry args={[0.05]} />
                    <meshStandardMaterial color="#b2ff59" emissive="#76ff03" emissiveIntensity={2} />
                </mesh>
                {/* Scythe Arms */}
                 {[1, -1].map((side, i) => (
                    <group key={i} position={[side * 0.2, 0.8, 0.2]} rotation={[0, side * 0.5, 0]}>
                        <mesh position={[0, 0, 0.3]} rotation={[Math.PI/4, 0, 0]}>
                            <cylinderGeometry args={[0.05, 0.08, 0.6]} />
                            <meshStandardMaterial color="#1b5e20" />
                        </mesh>
                        <mesh position={[0, -0.2, 0.6]} rotation={[-Math.PI/3, 0, 0]}>
                            <coneGeometry args={[0.04, 0.6]} />
                            <meshStandardMaterial color="#a5d6a7" metalness={0.4} />
                        </mesh>
                    </group>
                ))}
             </group>
         );
    }
    // Queen
    return (
        <group scale={1.6}>
             <pointLight distance={4} decay={2} intensity={2} color="#ffab00" />
             {/* Huge Abdomen */}
             <mesh position={[0, 0.5, -0.6]} scale={[1, 0.8, 1.2]}>
                 <sphereGeometry args={[0.6, 16, 16]} />
                 <meshStandardMaterial color="#3e2723" roughness={0.6} />
             </mesh>
             {/* Pulsing glow stripes on abdomen */}
             <mesh position={[0, 0.51, -0.6]} scale={[1.02, 0.82, 1.22]}>
                 <sphereGeometry args={[0.58, 16, 16]} />
                 <meshStandardMaterial color="#ffab00" transparent opacity={0.3} emissive="#ff6f00" wireframe />
             </mesh>

             {/* Thorax */}
             <mesh position={[0, 0.4, 0.1]}>
                 <sphereGeometry args={[0.35, 12, 12]} />
                 <meshStandardMaterial color="#212121" />
             </mesh>
             {/* Head */}
             <mesh position={[0, 0.3, 0.5]}>
                 <sphereGeometry args={[0.25]} />
                 <meshStandardMaterial color="#000" />
             </mesh>
              {/* Eyes */}
             <mesh position={[0.1, 0.35, 0.65]}>
                 <sphereGeometry args={[0.05]} />
                 <meshStandardMaterial color="#ffca28" emissive="#ffca28" emissiveIntensity={2} />
             </mesh>
             <mesh position={[-0.1, 0.35, 0.65]}>
                 <sphereGeometry args={[0.05]} />
                 <meshStandardMaterial color="#ffca28" emissive="#ffca28" emissiveIntensity={2} />
             </mesh>

             {/* Legs */}
             {[1, -1].map((side, i) => (
                <React.Fragment key={i}>
                    {[0, 1, 2].map((leg, j) => (
                        <mesh key={`${i}-${j}`} position={[side * 0.4, 0.2, j * 0.2 - 0.2]} rotation={[0, 0, side * -0.6]}>
                             <capsuleGeometry args={[0.04, 0.8]} />
                             <meshStandardMaterial color="#212121" />
                        </mesh>
                    ))}
                </React.Fragment>
            ))}
        </group>
    );
  };

  const renderNormalEnemy = () => {
      // BEETLE / RED BUG
      if (entity.name.includes("Beetle") || entity.char === '🪲') {
          return (
             <group>
                <pointLight distance={2} decay={2} intensity={1} color={color} />
                
                {/* Body Underneath - FLATTENED */}
                <mesh position={[0, 0.18, 0]} scale={[0.9, 0.4, 1.1]}>
                    <sphereGeometry args={[0.3, 16, 16]} />
                    <meshStandardMaterial color="#3e2723" />
                </mesh>

                {/* Shell (Elytra) - Split */}
                <mesh position={[0.12, 0.25, -0.05]} rotation={[0.1, 0, 0.2]}>
                    <capsuleGeometry args={[0.14, 0.45, 4, 8]} />
                    <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
                </mesh>
                <mesh position={[-0.12, 0.25, -0.05]} rotation={[0.1, 0, -0.2]}>
                     <capsuleGeometry args={[0.14, 0.45, 4, 8]} />
                    <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
                </mesh>

                {/* Head */}
                <mesh position={[0, 0.2, 0.32]}>
                    <boxGeometry args={[0.25, 0.15, 0.2]} />
                    <meshStandardMaterial color="#212121" />
                </mesh>
                 {/* Glowing Eyes */}
                <mesh position={[0.08, 0.22, 0.43]}>
                     <sphereGeometry args={[0.03]} />
                     <meshStandardMaterial color="#ffeb3b" emissive="#ffeb3b" emissiveIntensity={2} />
                </mesh>
                <mesh position={[-0.08, 0.22, 0.43]}>
                     <sphereGeometry args={[0.03]} />
                     <meshStandardMaterial color="#ffeb3b" emissive="#ffeb3b" emissiveIntensity={2} />
                </mesh>
                
                {/* Mandibles */}
                <mesh position={[0.1, 0.2, 0.42]} rotation={[0, 0.5, 0]}>
                    <coneGeometry args={[0.02, 0.15, 4]} />
                    <meshStandardMaterial color="#000" />
                </mesh>
                <mesh position={[-0.1, 0.2, 0.42]} rotation={[0, -0.5, 0]}>
                    <coneGeometry args={[0.02, 0.15, 4]} />
                    <meshStandardMaterial color="#000" />
                </mesh>
                
                {/* LEGS - Added to remove "floating dot" look */}
                {[1, -1].map((side) => 
                     [0, 1, 2].map((legIndex) => (
                         <mesh position={[side * 0.3, 0.1, 0.3 - (legIndex * 0.25)]} rotation={[0, 0, side * -0.6]} key={`${side}-${legIndex}`}>
                             <capsuleGeometry args={[0.03, 0.4]} />
                             <meshStandardMaterial color="#212121" />
                         </mesh>
                     ))
                )}
             </group>
          );
      }

      // SPIDER / WEAVER
      if (entity.name.includes("Weaver") || entity.char === '🕷️') {
          return (
             <group scale={0.7}>
                 <pointLight distance={2} decay={2} intensity={1} color={color} />
                 {/* Abdomen */}
                 <mesh position={[0, 0.3, -0.2]}>
                     <sphereGeometry args={[0.35, 12, 12]} />
                     <meshStandardMaterial color="#212121" />
                 </mesh>
                 <mesh position={[0, 0.3, -0.2]} scale={1.05}>
                     <sphereGeometry args={[0.35, 12, 12]} />
                     <meshStandardMaterial color={color} wireframe transparent opacity={0.3} />
                 </mesh>
                 {/* Cephalothorax */}
                 <mesh position={[0, 0.25, 0.2]}>
                     <sphereGeometry args={[0.2, 12, 12]} />
                     <meshStandardMaterial color="#000" />
                 </mesh>
                 {/* Eyes */}
                 <mesh position={[0.08, 0.3, 0.35]}>
                     <sphereGeometry args={[0.04]} />
                     <meshStandardMaterial color="#f44336" emissive="#f44336" emissiveIntensity={2} />
                 </mesh>
                 <mesh position={[-0.08, 0.3, 0.35]}>
                     <sphereGeometry args={[0.04]} />
                     <meshStandardMaterial color="#f44336" emissive="#f44336" emissiveIntensity={2} />
                 </mesh>
                  {/* Legs */}
                  {[1, -1].map((side, i) => (
                    <React.Fragment key={i}>
                        <mesh position={[side * 0.4, 0.2, -0.1]} rotation={[0, 0, side * -0.5]}>
                            <capsuleGeometry args={[0.04, 0.7]} />
                            <meshStandardMaterial color="#212121" />
                        </mesh>
                        <mesh position={[side * 0.4, 0.2, 0.2]} rotation={[0, 0, side * -0.5]}>
                            <capsuleGeometry args={[0.04, 0.7]} />
                            <meshStandardMaterial color="#212121" />
                        </mesh>
                    </React.Fragment>
                ))}
             </group>
          );
      }

      // CRAWLER / WORM
      if (entity.name.includes("Crawler") || entity.char === '🐛') {
          return (
            <group>
                <pointLight distance={2} decay={2} intensity={1} color={color} />
                {[0, 1, 2].map(i => (
                     <group key={i} position={[0, 0.15, -i * 0.25 + 0.25]}>
                        <mesh>
                            <sphereGeometry args={[0.18 - (i * 0.03), 12, 12]} />
                            <meshStandardMaterial color={color} roughness={0.6} />
                        </mesh>
                        {/* Spikes */}
                        <mesh position={[0.12, 0.1, 0]} rotation={[0, 0, -0.5]}>
                             <coneGeometry args={[0.03, 0.15, 4]} />
                             <meshStandardMaterial color="#3e2723" />
                        </mesh>
                        <mesh position={[-0.12, 0.1, 0]} rotation={[0, 0, 0.5]}>
                             <coneGeometry args={[0.03, 0.15, 4]} />
                             <meshStandardMaterial color="#3e2723" />
                        </mesh>
                    </group>
                ))}
            </group>
          );
      }

      // GENERIC ANT / DEFAULT
      return (
         <group>
             <pointLight distance={2} decay={2} intensity={1} color={color} />
             <mesh position={[0, 0.25, -0.1]} scale={[0.8, 0.8, 1.2]}>
                 <sphereGeometry args={[0.2, 12, 12]} />
                 <meshStandardMaterial color={color} />
             </mesh>
             <mesh position={[0, 0.3, 0.2]}>
                 <sphereGeometry args={[0.15, 12, 12]} />
                 <meshStandardMaterial color="#212121" />
             </mesh>
              {/* Mandibles */}
              <mesh position={[0.08, 0.25, 0.35]} rotation={[0, 0.2, 0]}>
                 <boxGeometry args={[0.03, 0.03, 0.15]} />
                 <meshStandardMaterial color="#000" />
             </mesh>
             <mesh position={[-0.08, 0.25, 0.35]} rotation={[0, -0.2, 0]}>
                 <boxGeometry args={[0.03, 0.03, 0.15]} />
                 <meshStandardMaterial color="#000" />
             </mesh>
         </group>
      );
  }

  return (
    <group ref={meshRef} position={[entity.pos.x, 0, entity.pos.y]}>
        <group ref={animRef}>
            {entity.isBoss ? renderBoss() : renderNormalEnemy()}
            
            {/* Health Bar */}
            {entity.hp !== undefined && entity.maxHp !== undefined && (
                 <HealthBar hp={entity.hp} maxHp={entity.maxHp} />
            )}
        </group>
    </group>
  );
};

const ItemModel: React.FC<{ entity: Entity }> = ({ entity }) => {
    return (
        <group position={[entity.pos.x, 0.2, entity.pos.y]}>
            <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
                {entity.name.includes("Jelly") ? (
                    <mesh>
                         <cylinderGeometry args={[0.15, 0.1, 0.2, 8]} />
                         <meshStandardMaterial color="#ffb300" transparent opacity={0.8} emissive="#ffb300" emissiveIntensity={0.5} />
                    </mesh>
                ) : entity.name.includes("Crystal") ? (
                    <mesh>
                        <octahedronGeometry args={[0.15]} />
                        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8} />
                    </mesh>
                ) : entity.name.includes("Nectar") ? (
                    <mesh>
                        <coneGeometry args={[0.1, 0.3, 8]} />
                        <meshStandardMaterial color="#ffeb3b" emissive="#fbc02d" emissiveIntensity={0.6} />
                    </mesh>
                ) : (
                    <mesh>
                        <boxGeometry args={[0.2, 0.2, 0.2]} />
                         <meshStandardMaterial color="#29b6f6" emissive="#29b6f6" emissiveIntensity={0.5} />
                    </mesh>
                )}
            </Float>
            <pointLight distance={1.5} intensity={2} color={entity.color.includes('yellow') ? '#ffb300' : '#29b6f6'} />
        </group>
    );
};

const ExitModel: React.FC<{ entity: Entity }> = ({ entity }) => {
    return (
         <group position={[entity.pos.x, 0, entity.pos.y]}>
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.8, 0.8, 0.1, 16]} />
                <meshStandardMaterial color="#fdd835" emissive="#fdd835" emissiveIntensity={0.5} />
            </mesh>
            <Float speed={1} floatIntensity={0.5}>
                <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI]}>
                    <coneGeometry args={[0.4, 1, 4]} />
                    <meshStandardMaterial color="#fdd835" transparent opacity={0.5} emissive="#fdd835" />
                </mesh>
            </Float>
            <pointLight position={[0, 1, 0]} intensity={3} color="#fdd835" distance={6} />
            <Sparkles count={20} scale={2} size={2} speed={0.4} opacity={0.7} color="#fff176" />
         </group>
    );
}

// --- MAIN SCENE ---

const Scene: React.FC<GameDisplayProps> = ({ gameState }) => {
  useThree(({ camera }) => {
    // Basic setup that doesn't need to run every frame
    camera.rotation.order = 'YXZ';
  });

  useFrame((state) => {
    const px = gameState.player.pos.x;
    const py = gameState.player.pos.y;
    const angle = gameState.player.angle || 0;

    const lookDirX = Math.cos(angle);
    const lookDirZ = Math.sin(angle);

    const camTargetPos = new THREE.Vector3(px, 0.45, py); 
    state.camera.position.lerp(camTargetPos, 0.4);

    const targetX = px + lookDirX * 5;
    const targetZ = py + lookDirZ * 5;
    
    state.camera.lookAt(targetX, 0.45, targetZ);

    if ((gameState.player.attackCooldown || 0) > 40) {
        state.camera.position.y += (Math.random() - 0.5) * 0.05;
        state.camera.position.x += (Math.random() - 0.5) * 0.05;
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} color="#4a3b32" />
      {/* Increased lighting for visibility */}
      <hemisphereLight intensity={0.1} color="#5d4037" groundColor="#000000" />
      {/* Adjusted fog to start later so nearby enemies are clear */}
      <fog attach="fog" args={['#0d0505', 4, 12]} /> 

      {/* RENDER MAP */}
      <group>
        {gameState.map.map((row, y) => 
            row.map((tile, x) => (
                <group key={`${x}-${y}`}>
                    {tile.type === 'FLOOR' && (
                        <group>
                            <FloorTile position={[x, 0, y]} visible={tile.visible} seen={tile.seen} />
                            {tile.seen && <CeilingTile position={[x, 0, y]} visible={tile.visible} seen={tile.seen} />}
                            {tile.visible && tile.decoration === 'MUSHROOM' && <MushroomDecoration position={[x, 0, y]} />}
                            {tile.visible && tile.decoration === 'PUDDLE' && <PuddleDecoration position={[x, 0, y]} />}
                            {tile.visible && tile.decoration === 'PEBBLE' && <PebbleDecoration position={[x, 0, y]} />}
                            {tile.visible && tile.decoration === 'CRYSTAL' && <CrystalDecoration position={[x, 0, y]} />}
                        </group>
                    )}
                    {tile.type === 'WALL' && <WallBlock position={[x, 0, y]} visible={tile.visible} seen={tile.seen} />}
                </group>
            ))
        )}
      </group>

      {/* ENTITIES */}
      <PlayerModel entity={gameState.player} />
      
      {gameState.entities.map(ent => {
          const visible = gameState.map[Math.floor(ent.pos.y)]?.[Math.floor(ent.pos.x)]?.visible;
          if (!visible) return null;

          if (ent.type === 'ENEMY') return <EnemyModel key={ent.id} entity={ent} playerPos={gameState.player.pos} />;
          if (ent.type === 'ITEM') return <ItemModel key={ent.id} entity={ent} />;
          if (ent.type === 'EXIT') return <ExitModel key={ent.id} entity={ent} />;
          return null;
      })}
    </>
  );
};

const GameDisplay: React.FC<GameDisplayProps> = ({ gameState }) => {
  return (
    <div className="w-full h-full bg-black relative">
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 75, position: [0, 0.5, 0] }}>
        <Scene gameState={gameState} />
      </Canvas>
      
      {/* HUD Overlay for messages */}
      <div className="absolute bottom-40 left-4 md:bottom-10 md:left-72 pointer-events-none z-10 flex flex-col-reverse gap-1 items-start">
         {gameState.messageLog.slice().reverse().map((msg, i) => (
            <div key={i} className={`text-sm md:text-base font-mono px-2 py-1 bg-black/50 text-[#dcedc8] border-l-2 ${msg.includes("hit") ? 'border-red-500 text-red-200' : 'border-[#7cb342]'}`}>
              {msg}
            </div>
         ))}
      </div>
      
      {/* Vignette Overlay for FPS vibe */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8)_100%)]"></div>
    </div>
  );
};

export default GameDisplay;
