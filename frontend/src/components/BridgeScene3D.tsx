import { Canvas } from '@react-three/fiber'
import { Line, OrbitControls, PerspectiveCamera, Stars, Text } from '@react-three/drei'
import { useMemo, useState } from 'react'
import type { CriticalZone, MonitoringPoint, Severity, StructuralModel } from '../models/simulation'

type Props = {
  zones: CriticalZone[]
  monitoringPoints: MonitoringPoint[]
  model: StructuralModel
}

// ---------------------------------------------------------------------------
// Geometría real del Viaducto de la Novena: 550.8 m de longitud, tablero de
// 30 m (6 carriles, 3+3), un único plano central de tirantes y dos pilonos
// asimétricos (112 m y 132 m medidos desde cimientos, porque el terreno bajo
// el segundo pilono es más profundo). Todo se modela en metros reales.
// ---------------------------------------------------------------------------
const SPAN_LENGTH = 550.8
const DECK_WIDTH = 30
const MEDIAN_WIDTH = 2.4
const DECK_LEVEL = 0
const TOWER_ABOVE_DECK = 58

type PylonConfig = { z: number; groundY: number; totalHeight: number; label: string }

const pylonConfigs: PylonConfig[] = [
  { z: -146, groundY: DECK_LEVEL - 54, totalHeight: 112, label: 'Pilono Norte · 112 m' },
  { z: 146, groundY: DECK_LEVEL - 74, totalHeight: 132, label: 'Pilono Sur · 132 m' },
]

const severityColor: Record<Severity, string> = {
  low: '#3fa66a',
  medium: '#f0b44d',
  high: '#e87a3d',
  critical: '#d94b4b',
}

const severityRank: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 }

// Escala continua verde -> amarillo -> naranja -> rojo, en el mismo orden de
// severidad que usa el motor de simulación, para pintar cada tirante.
const colorStops: [number, number, number][] = [
  [63, 166, 106],
  [240, 180, 77],
  [232, 122, 61],
  [217, 75, 75],
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function scoreToColor(score: number) {
  const clamped = Math.min(3, Math.max(0, score))
  const lower = Math.floor(clamped)
  const upper = Math.min(3, lower + 1)
  const t = clamped - lower
  const [r0, g0, b0] = colorStops[lower]
  const [r1, g1, b1] = colorStops[upper]
  const r = Math.round(lerp(r0, r1, t))
  const g = Math.round(lerp(g0, g1, t))
  const b = Math.round(lerp(b0, b1, t))
  return `rgb(${r}, ${g}, ${b})`
}

// Interpola la severidad reportada por el motor (zones) en cualquier punto
// del tablero (posición 0 a 1), ponderando por distancia inversa y anclando
// los extremos del puente en severidad "baja". Así, si los parámetros de la
// simulación (viento, sismo, tráfico, intensidad) resultan agresivos en un
// tramo, el propio componente enciende en rojo los tirantes de ese tramo,
// sin necesidad de tocar nada fuera de esta pieza.
function responseScoreAt(position: number, zones: CriticalZone[]): number {
  const samples = [
    { position: 0, rank: 0 },
    { position: 1, rank: 0 },
    ...zones.map((zone) => ({ position: zone.position, rank: severityRank[zone.severity] })),
  ]
  let weightedSum = 0
  let weightTotal = 0
  for (const sample of samples) {
    const distance = Math.abs(position - sample.position)
    const weight = 1 / Math.pow(distance + 0.03, 2)
    weightedSum += weight * sample.rank
    weightTotal += weight
  }
  return weightTotal > 0 ? weightedSum / weightTotal : 0
}

function normalizedPosition(z: number) {
  return Math.min(1, Math.max(0, (z + SPAN_LENGTH / 2) / SPAN_LENGTH))
}

type Stay = { anchorZ: number; attachY: number }

function buildStays(towerZ: number): Stay[] {
  const apexY = DECK_LEVEL + TOWER_ABOVE_DECK
  const attachTop = apexY - 3
  const attachBottom = apexY - 52
  const nCables = 14
  const maxReach = SPAN_LENGTH * 0.255
  const halfSpan = SPAN_LENGTH / 2 - 6
  const stays: Stay[] = []
  ;[-1, 1].forEach((dirSign) => {
    for (let i = 0; i < nCables; i++) {
      const t = i / (nCables - 1)
      const attachY = attachTop - t * (attachTop - attachBottom)
      const reach = 10 + t * (maxReach - 10)
      const anchorZ = Math.min(halfSpan, Math.max(-halfSpan, towerZ + dirSign * reach))
      stays.push({ anchorZ, attachY })
    }
  })
  return stays
}

function Deck() {
  const halfW = (DECK_WIDTH - MEDIAN_WIDTH) / 2
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (MEDIAN_WIDTH / 2 + halfW / 2), DECK_LEVEL, 0]} receiveShadow castShadow>
            <boxGeometry args={[halfW, 3.2, SPAN_LENGTH]} />
            <meshStandardMaterial color="#3a4048" roughness={0.7} metalness={0.2} />
          </mesh>
          <mesh position={[side * (MEDIAN_WIDTH / 2 + halfW / 2), DECK_LEVEL + 1.62, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[halfW - 0.6, SPAN_LENGTH]} />
            <meshStandardMaterial color="#2c3036" roughness={0.9} />
          </mesh>
          {[1, 2].map((lane) => {
            const lx = side * (MEDIAN_WIDTH / 2) + side * (halfW / 3) * lane
            return (
              <mesh key={lane} position={[lx, DECK_LEVEL + 1.66, 0]}>
                <boxGeometry args={[0.22, 0.05, SPAN_LENGTH]} />
                <meshStandardMaterial color="#f4e6b8" emissive="#554000" emissiveIntensity={0.4} roughness={0.5} />
              </mesh>
            )
          })}
          <mesh position={[side * DECK_WIDTH / 2, DECK_LEVEL + 2.15, 0]} castShadow>
            <boxGeometry args={[0.25, 1.1, SPAN_LENGTH]} />
            <meshStandardMaterial color="#d8e8f5" emissive="#6fb8ff" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, DECK_LEVEL, 0]}>
        <boxGeometry args={[MEDIAN_WIDTH, 3.6, SPAN_LENGTH]} />
        <meshStandardMaterial color="#4b5561" roughness={0.75} />
      </mesh>
    </group>
  )
}

function Pylon({ config, zones }: { config: PylonConfig; zones: CriticalZone[] }) {
  const apexY = DECK_LEVEL + TOWER_ABOVE_DECK
  const shaftHeight = apexY - config.groundY
  const stays = useMemo(() => buildStays(config.z), [config.z])
  return (
    <group>
      <mesh position={[0, config.groundY + shaftHeight / 2, config.z]} castShadow>
        <cylinderGeometry args={[1.6, 2.6, shaftHeight, 8, 1]} />
        <meshStandardMaterial color="#eef1f4" roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[0, config.groundY - 2.4, config.z]} castShadow>
        <boxGeometry args={[11, 4.6, 13]} />
        <meshStandardMaterial color="#6b7178" roughness={0.85} />
      </mesh>
      {stays.map((stay, index) => {
        const score = responseScoreAt(normalizedPosition(stay.anchorZ), zones)
        const color = scoreToColor(score)
        return (
          <group key={index}>
            <Line
              points={[
                [0, stay.attachY, config.z],
                [0, DECK_LEVEL + 1.9, stay.anchorZ],
              ]}
              color={color}
              lineWidth={1.4}
            />
            <mesh position={[0, DECK_LEVEL + 1.9, stay.anchorZ]}>
              <sphereGeometry args={[0.55, 8, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6 + score * 0.3} />
            </mesh>
          </group>
        )
      })}
      <Text
        position={[16, apexY - 8, config.z]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={5.5}
        color="#bfe4ff"
        anchorX="center"
      >
        {config.label}
      </Text>
    </group>
  )
}

function ResponseMarkers({ zones, monitoringPoints, model: _model }: Props) {
  const [selected, setSelected] = useState<CriticalZone | null>(null)
  return (
    <group>
      {zones.map((zone) => {
        const z = (zone.position - 0.5) * SPAN_LENGTH
        return (
          <group
            key={zone.label}
            position={[0, DECK_LEVEL + 5.5, z]}
            onClick={(event) => {
              event.stopPropagation()
              setSelected(zone)
            }}
          >
            <mesh>
              <sphereGeometry args={[zone.severity === 'critical' ? 1.7 : 1.2, 24, 16]} />
              <meshStandardMaterial color={severityColor[zone.severity]} emissive={severityColor[zone.severity]} emissiveIntensity={0.5} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.2, 0]}>
              <ringGeometry args={[1.6, 2.2, 24]} />
              <meshBasicMaterial color={severityColor[zone.severity]} transparent opacity={0.55} />
            </mesh>
          </group>
        )
      })}
      {monitoringPoints.map((point, index) => {
        const z = (point.position - 0.5) * SPAN_LENGTH
        return (
          <group key={`${point.position}-${index}`} position={[DECK_WIDTH / 2 + 3.2, DECK_LEVEL + 3.4, z]}>
            <mesh>
              <cylinderGeometry args={[0.7, 0.7, 2, 12]} />
              <meshStandardMaterial color="#79c7b8" emissive="#247f75" emissiveIntensity={0.45} />
            </mesh>
            <Text position={[0, 1.9, 0]} fontSize={1.1} color="#d9f4ed" anchorX="center">
              {index + 1}
            </Text>
          </group>
        )
      })}
      {selected && (
        <group position={[0, DECK_LEVEL + 9.5, (selected.position - 0.5) * SPAN_LENGTH]}>
          <Text fontSize={1.5} color="#ffffff" anchorX="center" outlineWidth={0.12} outlineColor="#1d2d31">
            {selected.label} · {selected.severity}
          </Text>
        </group>
      )}
    </group>
  )
}

function TowerBridgeModel({ model, zones, monitoringPoints }: Props) {
  const halfLength = model.length / 2
  const towerGap = Math.min(61, model.length * 0.35)
  const towerHeight = model.height
  const deckY = 0
  const towerPositions = [-towerGap / 2, towerGap / 2]
  const sideSpan = (model.length - towerGap) / 2
  const deckWidth = Math.max(12, Math.min(model.width, 61))
  return (
    <group>
      <mesh position={[0, deckY, 0]} receiveShadow castShadow>
        <boxGeometry args={[deckWidth, 2.4, model.length]} />
        <meshStandardMaterial color="#28333e" roughness={0.75} />
      </mesh>
      <mesh position={[0, deckY + 1.25, 0]}>
        <boxGeometry args={[deckWidth - 4, 0.08, model.length]} />
        <meshStandardMaterial color="#b9bec1" roughness={0.8} />
      </mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * (deckWidth / 2 - 1), deckY + 2.1, 0]}>
        <boxGeometry args={[0.3, 1.2, model.length]} />
        <meshStandardMaterial color="#2c6b8d" metalness={0.5} />
      </mesh>)}
      {towerPositions.map((position) => <group key={position}>
        <mesh position={[0, towerHeight / 2, position]} castShadow>
          <boxGeometry args={[18, towerHeight, 15]} />
          <meshStandardMaterial color="#b9ab8f" roughness={0.85} />
        </mesh>
        <mesh position={[0, deckY + 4, position]}>
          <boxGeometry args={[deckWidth * 0.55, 8, 16]} />
          <meshStandardMaterial color="#172229" />
        </mesh>
        <mesh position={[0, towerHeight + 3, position]}>
          <coneGeometry args={[13, 8, 4]} />
          <meshStandardMaterial color="#8f8267" roughness={0.9} />
        </mesh>
        {[-1, 1].map((side) => <mesh key={side} position={[side * 7, towerHeight / 2, position]}>
          <boxGeometry args={[2, towerHeight + 5, 2]} />
          <meshStandardMaterial color="#8f8267" roughness={0.9} />
        </mesh>)}
      </group>)}
      {[-1, 1].map((direction) => <group key={direction}>
        <mesh position={[0, deckY + 0.1, direction * (towerGap / 4)]}>
          <boxGeometry args={[deckWidth, 2.4, towerGap / 2]} />
          <meshStandardMaterial color="#35414b" roughness={0.75} />
        </mesh>
        <Line points={[[0, deckY + 2, direction * (towerGap / 2)], [0, deckY + 2, direction * halfLength]]} color="#2c6b8d" lineWidth={2} />
      </group>)}
      {[-1, 1].map((side) => <group key={side}>
        <mesh position={[side * (deckWidth / 2 - 2), towerHeight * 0.7, 0]}>
          <boxGeometry args={[3, 2.4, towerGap]} />
          <meshStandardMaterial color="#b9ab8f" roughness={0.85} />
        </mesh>
        {towerPositions.map((towerPosition) => <Line key={towerPosition} points={[[side * (deckWidth / 2 - 2), towerHeight * 0.7, towerPosition], [side * (deckWidth / 2 - 2), deckY + 2.2, towerPosition - Math.sign(towerPosition) * sideSpan]]} color="#2f6f9c" lineWidth={1.2} />)}
      </group>)}
      <ResponseMarkers zones={zones} monitoringPoints={monitoringPoints} model={model} />
    </group>
  )
}

export function BridgeScene3D({ zones, monitoringPoints, model }: Props) {
  const isTowerBridge = model.name.toLowerCase().includes('tower bridge')
  const modelScale = [model.width / DECK_WIDTH, model.height / 112, model.length / SPAN_LENGTH] as [number, number, number]
  return (
    <div className="scene-3d" aria-label={`Modelo 3D interactivo de ${model.name}`}>
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[340, 150, 420]} fov={42} />
        <color attach="background" args={['#0a1628']} />
        <fogExp2 attach="fog" args={['#132844', 0.0012]} />
        <ambientLight intensity={0.9} color="#3a4f6b" />
        <directionalLight position={[-260, 340, -180]} intensity={1.2} color="#9fc2ff" castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[420, 130, 260]} intensity={0.6} color="#ffd9a0" distance={1400} />
        <Stars radius={700} depth={60} count={1400} factor={4} fade speed={0.4} />
        {isTowerBridge ? <TowerBridgeModel model={model} zones={zones} monitoringPoints={monitoringPoints} /> : <group scale={modelScale}>
          <Deck />
          {pylonConfigs.map((config) => (
            <Pylon key={config.z} config={config} zones={zones} />
          ))}
          <ResponseMarkers zones={zones} monitoringPoints={monitoringPoints} model={model} />
        </group>}
        <Text position={[0, 105, 0]} fontSize={7} color="#f5bf77" anchorX="center">
          {model.name}
        </Text>
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={140}
          maxDistance={900}
          target={[0, DECK_LEVEL + 25, 0]}
        />
      </Canvas>
      <div className="scene-help"><span>Arrastra</span> orbita · <span>rueda</span> zoom · el color de cada tirante refleja la severidad simulada en ese punto</div>
    </div>
  )
}
