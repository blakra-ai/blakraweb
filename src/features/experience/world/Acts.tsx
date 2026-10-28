import { Billboard } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferGeometry, Color, Group, LineBasicMaterial, LineLoop, Mesh, MeshBasicMaterial, ShaderMaterial, Vector3 } from 'three'
import type { LayerId } from '../../../content/types'
import { BlackHole } from '../objects/BlackHole'
import { Lotus } from '../objects/Lotus'
import { Wordmark } from '../objects/Wordmark'
import { blackHole, chakras } from '../tokens'
import { film, LAYERS } from '../state'
import { AXIS, DISK_TILT, fromDisk, onAxis } from '../space'
import { beat, beats, bloomAt, cameraAt, centreY, damp, ease, jetBase, span, starAt, stars, stationAt } from '../timeline'
import { pointer } from '../controllers/pointer'
export const HOLE_R = 0.62

/** The camera follows the director's path; the cursor adds a little parallax; the launch shakes it. */
export function CameraRig() {
  const { camera } = useThree()
  const at = useMemo(() => ({ pos: [0, 0, 0] as [number, number, number], look: [0, 0, 0] as [number, number, number] }), [])
  const par = useRef({ x: 0, y: 0 })
  const look = useMemo(() => new Vector3(), [])
  useFrame((state, dt) => {
    cameraAt(film.t, film.portrait, at)
    par.current.x = damp(par.current.x, pointer.x, 2, dt)
    par.current.y = damp(par.current.y, pointer.y, 2, dt)
    const shake = film.still ? 0 : Math.sin(span(film.t, beats.launch[0], beats.launch[0] + 0.02) * Math.PI) * 0.12
    const tt = state.clock.elapsedTime
    camera.position.set(at.pos[0] + par.current.x * 0.5 + Math.sin(tt * 41) * shake, at.pos[1] + par.current.y * 0.3 + Math.cos(tt * 37) * shake, at.pos[2])
    look.set(at.look[0], at.look[1], at.look[2])
    camera.lookAt(look)
  })
  return null
}

/** Act II: a point of black appears, a shockwave crosses the frame, and the hole holds the centre. */
export function Hole({ phone }: { phone: boolean }) {
  const g = useRef<Group>(null)
  const ripple = useRef<ShaderMaterial>(null)
  const rippleMesh = useRef<Mesh>(null)
  const opacity = useRef(0)
  const mark = useRef(0)
  const pull = useRef(0)
  const hole = useRef(new Vector3())
  const radius = useRef(0.01)
  const uniforms = useMemo(() => ({ uR: { value: 0 }, uA: { value: 0 } }), [])
  useFrame((_, dt) => {
    const T = film.t
    const born = ease(span(T, beats.ignition[0], beats.ignition[0] + 0.018))
    const o = g.current
    if (o) {
      const r = HOLE_R * born * (1 + 0.15 * Math.sin(born * Math.PI))
      o.scale.setScalar(Math.max(0.0001, r))
      o.visible = born > 0
      o.rotation.x = damp(o.rotation.x, -pointer.y * blackHole.cursorTilt * 0.6, 3, dt)
      radius.current = o.scale.x
    }
    // The disk of light comes in as the pieces settle; it stays through the film.
    opacity.current = ease(span(T, beats.infall[0] + 0.03, beats.infall[1]))
    // The shockwave: one ring racing out across the frame. (Uniforms are set on the material:
    // R3F copies the uniforms object it is given.)
    const w = span(T, beats.ignition[0] + 0.004, beats.ignition[1] + 0.01)
    const u = ripple.current?.uniforms
    if (u) {
      u.uR.value = w * 15
      u.uA.value = w > 0 && w < 1 ? Math.sin(w * Math.PI) : 0
    }
    // A full-screen quad: drawn only while the wave runs.
    if (rippleMesh.current) rippleMesh.current.visible = w > 0 && w < 1
    // BLAKRA behind the hole, bent by it, for Acts II–III; drawn in as the camera turns away.
    mark.current = ease(span(T, beats.mark[0] - 0.02, beats.mark[0] + 0.02)) * (1 - ease(span(T, beats.build[0] - 0.02, beats.build[0] + 0.02)))
    pull.current = ease(span(T, beats.build[0] - 0.04, beats.build[0] + 0.01))
  })
  return (
    <>
      <Wordmark z={-3.2} y={0} hole={hole} radius={radius} pull={pull} phone={phone} alpha={mark} span={phone ? 0.9 : 0.58} />
      <group ref={g}>
        <BlackHole tilt={DISK_TILT - blackHole.diskTilt} opacity={opacity} />
      </group>
      <Billboard>
        <mesh ref={rippleMesh} renderOrder={5} visible={false}>
          <planeGeometry args={[48, 48]} />
          <shaderMaterial
            ref={ripple}
            transparent
            depthWrite={false}
            uniforms={uniforms}
            vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
            fragmentShader={`uniform float uR; uniform float uA; varying vec2 vUv;
              void main(){ float d = length(vUv - 0.5) * 48.0; float x = d - uR;
                float dark = exp(-pow(x / 0.32, 2.0)); float light = exp(-pow((x + 0.9) / 0.9, 2.0));
                vec3 c = mix(vec3(1.0), vec3(0.04), dark / max(dark + light, 1e-3));
                gl_FragColor = vec4(c, max(dark * 0.7, light * 0.5) * uA); }`}
          />
        </mesh>
      </Billboard>
    </>
  )
}

/** Act IV: the seven centres bloom up the spin axis, root first; then light charges the column. */
export function Column() {
  const refs = useRef<(Group | null)[]>([])
  const spark = useRef<Mesh>(null)
  const p = useMemo(() => new Vector3(), [])
  useFrame((_, dt) => {
    const T = film.t
    const chosen = film.need
    // Out of the way while the camera looks down the axis at the ring of light.
    // Away while the camera looks down the axis (they would grow toward it); back once it has turned.
    const away = ease(span(T, beats.product[0] - 0.015, beats.product[0] + 0.005)) * (1 - ease(span(T, beats.orbit[0] + 0.008, beats.orbit[0] + 0.028)))
    refs.current.forEach((o, k) => {
      if (!o) return
      const lk = bloomAt(k)
      const bloom = ease(span(T, lk, lk + 0.026))
      const mine = chosen && chosen.layers.includes(LAYERS[k]) ? 1.18 : 1
      // The charge passing through makes each centre swell for a moment.
      const charge = beat(T, beats.charge)
      const swell = 1 + 0.25 * Math.exp(-Math.pow((charge * 7.5 - k - 0.5) / 0.6, 2))
      const s = 0.72 * bloom * (1 + 0.12 * Math.sin(bloom * Math.PI)) * mine * swell * (1 - away)
      o.scale.setScalar(damp(o.scale.x, Math.max(0.0001, s), 8, dt))
      // Not drawn until it blooms (and while the camera looks down the axis).
      o.visible = o.scale.x > 0.002
      o.rotation.y += dt * (0.2 + k * 0.03)
    })
    // The spark that charges the column, root to crown.
    const c = beat(T, beats.charge)
    if (spark.current) {
      spark.current.visible = c > 0 && c < 1
      onAxis(centreY(0) + c * (centreY(6) - centreY(0) + 0.6), p)
      spark.current.position.copy(p)
      spark.current.scale.setScalar(0.12 + 0.05 * Math.sin(film.clock * 20))
    }
  })
  // Each centre lies flat across the axis.
  // Tipped toward the viewer, so each opens to the camera rather than showing its edge.
  const across = -DISK_TILT - Math.PI / 2 + 0.6
  return (
    <>
      {chakras.map((c, k) => {
        const at = onAxis(centreY(k), new Vector3())
        return (
          <group key={c.name} ref={(el) => {
            refs.current[k] = el
          }} position={at} rotation={[across, 0, 0]} scale={0.0001}>
            <Lotus index={k} />
          </group>
        )
      })}
      <mesh ref={spark}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </>
  )
}

/** Act V: the crown releases the jet up the axis; shock diamonds ride it. */
export function Jet() {
  const beam = useRef<Mesh>(null)
  const mat = useRef<ShaderMaterial>(null)
  const sheathMat = useRef<ShaderMaterial>(null)
  const diamonds = useRef<(Mesh | null)[]>([])
  const sheathUniforms = useMemo(() => ({ uTime: { value: 0 }, uFront: { value: 0 }, uA: { value: 0 } }), [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFront: { value: 0 }, uA: { value: 0 } }), [])
  const LEN = 34
  const base = useMemo(() => onAxis(jetBase, new Vector3()), [])
  useFrame(() => {
    const T = film.t
    const front = ease(span(T, beats.launch[0], beats.systems[0] + 0.06))
    const u = mat.current?.uniforms
    if (!u) return
    u.uTime.value = film.clock
    u.uFront.value = front
    // Bright at launch, steady through the five systems, a calm trace at the end.
    const fade = 1 - ease(span(T, beats.product[0], beats.product[0] + 0.022))
    u.uA.value = front > 0 ? (T < beats.running[0] ? fade : 0.35) : 0
    if (beam.current) beam.current.visible = u.uA.value > 0
    const v = sheathMat.current?.uniforms
    if (v) {
      v.uTime.value = u.uTime.value
      v.uFront.value = front
      v.uA.value = u.uA.value
    }
    diamonds.current.forEach((d, i) => {
      if (!d) return
      const h = 1.6 + i * 2.6
      const lit = front * LEN > h ? 1 : 0
      // Full only while the jet is: they shrink away with its fade and stay off in the calm trace.
      const a = T < beats.running[0] ? u.uA.value : 0
      d.visible = lit > 0 && a > 0.02
      d.scale.setScalar((0.32 + 0.05 * Math.sin(film.clock * 6 + i)) * a)
    })
  })
  const quat = useMemo(() => {
    const g = new Group()
    g.lookAt(AXIS)
    g.rotateX(Math.PI / 2)
    return g.quaternion.clone()
  }, [])
  return (
    <group position={base} quaternion={quat}>
      <mesh ref={beam} position={[0, LEN / 2, 0]}>
        <cylinderGeometry args={[0.26, 0.1, LEN, 48, 1, true]} />
        <shaderMaterial
          ref={mat}
          transparent
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={`varying vec2 vUv; varying float vEdge;
            void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vec3 n = normalize(normalMatrix * normal); vEdge = 1.0 - abs(dot(n, normalize(-mv.xyz)));
              gl_Position = projectionMatrix * mv; }`}
          fragmentShader={`uniform float uTime; uniform float uFront; uniform float uA; varying vec2 vUv; varying float vEdge;
            void main(){ float y = vUv.y; if (y > uFront) discard;
              float flow = 0.7 + 0.3 * sin(y * 90.0 - uTime * 16.0);
              float edge = vEdge;
              vec3 core = vec3(0.04, 0.04, 0.06);
              vec3 sheath = mix(vec3(0.6, 0.31, 0.82), mix(vec3(0.16, 0.62, 0.88), vec3(0.97, 0.48, 0.12), y), y);
              vec3 c = mix(core, sheath, smoothstep(0.25, 0.85, edge));
              float tip = 1.0 - smoothstep(uFront - 0.04, uFront, y);
              gl_FragColor = vec4(c * flow, (0.92 - 0.25 * edge) * uA * tip); }`}
        />
      </mesh>
      {/* The sheath: the seven colours streaming around the core, brightest at its edges. */}
      <mesh position={[0, LEN / 2, 0]}>
        <cylinderGeometry args={[0.85, 0.32, LEN, 64, 1, true]} />
        <shaderMaterial
          ref={sheathMat}
          transparent
          depthWrite={false}
          uniforms={sheathUniforms}
          vertexShader={`varying vec2 vUv; varying float vEdge;
            void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vec3 n = normalize(normalMatrix * normal); vEdge = 1.0 - abs(dot(n, normalize(-mv.xyz)));
              gl_Position = projectionMatrix * mv; }`}
          fragmentShader={`uniform float uTime; uniform float uFront; uniform float uA; varying vec2 vUv; varying float vEdge;
            vec3 wheel(float t){ t = fract(t) * 6.0;
              vec3 c[7]; c[0]=vec3(0.91,0.21,0.17); c[1]=vec3(0.96,0.48,0.12); c[2]=vec3(0.97,0.76,0.11); c[3]=vec3(0.18,0.7,0.35);
              c[4]=vec3(0.16,0.62,0.88); c[5]=vec3(0.26,0.28,0.76); c[6]=vec3(0.6,0.31,0.82);
              int i = int(floor(t)); return mix(c[i], c[i + 1], fract(t)); }
            void main(){ float y = vUv.y; if (y > uFront) discard;
              float streak = 0.55 + 0.45 * sin(vUv.x * 40.0 + y * 60.0 - uTime * 9.0);
              vec3 c = wheel(y * 0.9 + vUv.x * 0.15);
              float tip = 1.0 - smoothstep(uFront - 0.05, uFront, y);
              float a = pow(vEdge, 1.6) * 0.6 * streak * uA * tip * smoothstep(0.0, 0.03, y);
              gl_FragColor = vec4(c, a); }`}
        />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} ref={(el) => {
          diamonds.current[i] = el
        }} position={[0, 1.6 + i * 2.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, 0.06, 12, 64]} />
          <meshBasicMaterial color="#0b0b10" transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Act V: five systems ignite along the jet, each in its layers' colours; the one nearest the visitor's need flares. */
export function Stars({ layersOf }: { layersOf: (readonly LayerId[])[] }) {
  const refs = useRef<(Group | null)[]>([])
  const places = useMemo(() => stars.map(([x, h, dz]) => onAxis(h, new Vector3()).add(new Vector3(x, 0, dz))), [])
  const tints = useMemo(() => layersOf.map((ls) => ls.reduce((c, l) => c.add(new Color(chakras[LAYERS.indexOf(l)].color)), new Color(0, 0, 0)).multiplyScalar(1 / ls.length)), [layersOf])
  useFrame((state, dt) => {
    const T = film.t
    refs.current.forEach((o, k) => {
      if (!o) return
      const tk = starAt(k) - 0.008
      const lit = ease(span(T, tk, tk + 0.014))
      const near = film.need && film.need.proof === k ? 1.5 : 1
      const s = lit * (1 + 0.2 * Math.sin(lit * Math.PI)) * near * (T > beats.product[0] ? 0.0001 : 1)
      o.scale.setScalar(damp(o.scale.x, Math.max(0.0001, s), 7, dt))
      o.visible = o.scale.x > 0.002
      o.rotation.z += dt * 0.3
      void state
    })
  })
  return (
    <>
      {places.map((p, k) => (
        <group key={k} ref={(el) => {
          refs.current[k] = el
        }} position={p} scale={0.0001}>
          <mesh>
            <sphereGeometry args={[0.42, 48, 48]} />
            <meshBasicMaterial color={tints[k]} toneMapped={false} />
          </mesh>
          <Billboard>
            <mesh>
              <ringGeometry args={[0.7, 0.74, 96]} />
              <meshBasicMaterial color="#0b0b10" transparent opacity={0.5} />
            </mesh>
            <mesh>
              <ringGeometry args={[1.05, 1.07, 96]} />
              <meshBasicMaterial color="#0b0b10" transparent opacity={0.25} />
            </mesh>
          </Billboard>
        </group>
      ))}
    </>
  )
}

/** Act VI: how we work as one stable orbit, its stations lighting in turn; the last one is the key. */
const ORBIT_R = 4.5
export function Orbit() {
  const g = useRef<Group>(null)
  const dots = useRef<(Mesh | null)[]>([])
  const mats = useRef<(MeshBasicMaterial | null)[]>([])
  const ring = useMemo(() => {
    const v = new Vector3()
    const points = Array.from({ length: 161 }, (_, i) => {
      const a = (i / 160) * Math.PI * 2
      return fromDisk(Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R, 0, v).clone()
    })
    return new LineLoop(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color: '#0b0b10', transparent: true, opacity: 0.4 }))
  }, [])
  const ink = useMemo(() => new Color('#0b0b10'), [])
  const grey = useMemo(() => new Color('#b8b4ab'), [])
  useFrame((_, dt) => {
    const T = film.t
    if (g.current) g.current.visible = T > beats.orbit[0] - 0.01 && T < beats.running[1]
    dots.current.forEach((d, k) => {
      if (!d) return
      const a = (k / 5) * Math.PI * 2 + film.clock * 0.08
      fromDisk(Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R, 0, d.position)
      // Grey until its term lights; then ink, with a swell as it does. Smaller once the system runs.
      const x = span(T, stationAt(k), stationAt(k) + 0.007)
      const s = (0.13 + 0.07 * (x > 0 ? 1 : 0) + 0.12 * Math.sin(x * Math.PI)) * (T > beats.running[0] + 0.03 ? 0.6 : 1)
      d.scale.setScalar(film.still ? s : damp(d.scale.x, s, 10, dt))
      mats.current[k]?.color.lerpColors(grey, ink, ease(x))
    })
  })
  return (
    <group ref={g}>
      <primitive object={ring} />
      {Array.from({ length: 5 }, (_, k) => (
        <mesh key={k} ref={(el) => {
          dots.current[k] = el
        }}>
          {k === 4 ? <torusGeometry args={[1, 0.3, 16, 48]} /> : <sphereGeometry args={[1, 24, 24]} />}
          <meshBasicMaterial ref={(el) => {
            mats.current[k] = el
          }} color="#b8b4ab" />
        </mesh>
      ))}
    </group>
  )
}

/** Act VI: three equal bodies on the stable figure-eight: the three principals. */
export function Bodies() {
  const g = useRef<Group>(null)
  const bodies = useRef<(Mesh | null)[]>([])
  useFrame(() => {
    const T = film.t
    const show = ease(span(T, beats.people[0] - 0.01, beats.people[0] + 0.01)) * (1 - ease(span(T, beats.running[0], beats.running[0] + 0.02)))
    if (g.current) {
      g.current.visible = show > 0.001
      g.current.scale.setScalar(Math.max(0.0001, show))
    }
    bodies.current.forEach((b, i) => {
      if (!b) return
      // The figure-eight choreography, close to x = sin t, y = sin 2t / 2, three bodies a third apart.
      const a = film.clock * 0.5 + (i * Math.PI * 2) / 3
      b.position.set(Math.sin(a) * 3.4, Math.sin(2 * a) * 1.2, 0)
    })
  })
  return (
    <group ref={g} position={[1.2, 2.2, 4.5]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => {
          bodies.current[i] = el
        }}>
          <sphereGeometry args={[0.42, 48, 48]} />
          <meshPhysicalMaterial color="#0b0b10" roughness={0.12} clearcoat={1} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * The visitor's need, the film's protagonist: pulled into the disk when chosen, carried up to
 * its highest layer, out along the jet to the system that matches it, and waiting at the end.
 */
export function Mote({ phone }: { phone: boolean }) {
  const m = useRef<Mesh>(null)
  const p = useMemo(() => new Vector3(), [])
  const q = useMemo(() => new Vector3(), [])
  useFrame((_, dt) => {
    const o = m.current
    if (!o) return
    const need = film.need
    const T = film.t
    const time = film.clock
    o.visible = Boolean(need) || T > beats.running[0]
    if (!o.visible) return
    const top = need ? Math.max(...need.layers.map((l) => LAYERS.indexOf(l))) : 6
    if (T < beats.build[0] + 0.02) {
      // Falling in after the choice, then orbiting at its top layer's band.
      const f = need ? ease(Math.min(1, (time - need.at) / 1.6)) : 1
      const r = 5.4 + (1.45 + ((top + 0.5) / 7) * 2.75 - 5.4) * f
      const a = time * 0.6 + f * 6
      fromDisk(Math.cos(a) * r, Math.sin(a) * r, (1 - f) * 0.8, p)
    } else if (T < beats.launch[0]) {
      onAxis(centreY(top), p).add(q.set(0.9, 0, 0))
    } else if (T < beats.product[0]) {
      // Beside the system its need names; with none named, beside the latest star to ignite.
      let lit = 0
      while (lit < stars.length - 1 && T >= starAt(lit + 1)) lit++
      const k = need && need.proof >= 0 ? need.proof : lit
      const [x, h, dz] = stars[k]
      onAxis(h, p).add(q.set(x, 0, dz)).add(q.set(0.8, 0.5, 0.4))
    } else {
      p.set(phone ? -0.6 : -3.4, phone ? 2.6 : 1.2, 8.5)
    }
    o.position.lerp(p, 1 - Math.exp(-dt * 4))
    o.scale.setScalar(0.16 + 0.03 * Math.sin(time * 5))
  })
  return (
    <mesh ref={m}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#ff5a1f" toneMapped={false} />
    </mesh>
  )
}
