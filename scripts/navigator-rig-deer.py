"""
Rig the Mecha roe deer (Osho, CC BY 4.0) headless in Blender 4.3 and author her clips:

  blender -b --python-use-system-env -P scripts/navigator-rig-deer.py -- <scene.gltf> <out.glb>

The delivery is seven rigid meshes with no bones. This script separates them into their loose
parts (bolts, plates, segments), builds a quadruped skeleton (Hips … Spine2, Neck, Neck2, Head,
Ear_L/R, Jet_L/R, Plate_L/R, four legs × Upper/Lower/Hoof), assigns every part to one bone by its
place (rigid weights: no deformation, the joints are the artist's own seams), joins the parts
per bone and material (a handful of draw calls), and keys two clips on the armature:
"Walk" (1.0 s, a diagonal gait: LF+RH then RF+LH, 1 % body bob, the head counter-bobbing, the
plates swaying a beat behind, the ears trailing) and "Idle" (3 s: a weight shift, a slow look,
an ear flick). Both go out as NLA tracks in the GLB; scripts/navigator-adopt.mjs then adopts the
file as navigator.glb (eyes, lids, systems, textures).
"""
import bpy, sys, math
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
FPS = 24

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS
bpy.ops.import_scene.gltf(filepath=SRC)

# ---- Loose parts ---------------------------------------------------------------------------
for ob in [o for o in bpy.data.objects if o.type == 'MESH']:
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT')
parts = [o for o in bpy.data.objects if o.type == 'MESH']
# Bake the import's transforms (cm → m, z-up) into the meshes so every part lives in world space.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o)


def bounds(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    return mn, mx, (mn + mx) / 2


# ---- Which bone owns a part (world frame: x forward, y left, z up) -------------------------
LEGS = {
    'FL': dict(x=(0.3, 1.3), y=(0.3, 0.8), bands=(0.6, 1.0)),
    'FR': dict(x=(0.3, 1.3), y=(-0.8, -0.3), bands=(0.6, 1.0)),
    'HL': dict(x=(-1.4, -0.2), y=(0.28, 0.8), bands=(0.45, 0.75)),
    'HR': dict(x=(-1.4, -0.2), y=(-0.5, -0.05), bands=(0.45, 0.75)),
}


def owner(mn, mx, c):
    if c.z > 2.58 and c.x > 0.4:
        # The ears are the wide fins either side of the skull; the lenses and the face plates are narrow and stay with the head.
        if abs(c.y) > 0.36 or (abs(c.y) > 0.2 and (mx.y - mn.y) > 0.3):
            return 'Ear_L' if c.y > 0 else 'Ear_R'
        return 'Head'
    if c.x > 0.42 and 2.25 <= c.z <= 2.58 and abs(c.y) < 0.35:
        return 'Neck2'
    if c.x > 0.42 and 1.92 <= c.z < 2.25 and abs(c.y) < 0.35:
        return 'Neck'
    if 0.1 < c.x < 0.45 and c.z > 1.7 and 0.08 < abs(c.y) < 0.32:
        return 'Jet_L' if c.y > 0 else 'Jet_R'
    if 0.3 < c.x < 0.85 and c.z > 1.2 and abs(c.y) > 0.45 and (mx.y - mn.y) < 0.12:
        return 'Plate_L' if c.y > 0 else 'Plate_R'
    for leg, r in LEGS.items():
        if r['x'][0] <= c.x <= r['x'][1] and r['y'][0] <= c.y <= r['y'][1] and c.z < 2.0:
            lo, hi = r['bands']
            seg = 'Hoof' if c.z < lo else 'Lower' if c.z < hi else 'Upper'
            return f'{leg}_{seg}'
    if c.x < -0.2:
        return 'Hips'
    if c.x < 0.2:
        return 'Spine'
    if c.x < 0.45:
        return 'Spine1'
    return 'Spine2'


assign = {}
for o in parts:
    mn, mx, c = bounds(o)
    assign[o.name] = (owner(mn, mx, c), mn, mx, c)

# ---- The skeleton: joints from the parts themselves for the legs -----------------------------
def joints(leg):
    zs = {}
    for seg in ('Upper', 'Lower', 'Hoof'):
        ps = [v for v in assign.values() if v[0] == f'{leg}_{seg}']
        if not ps:
            return None
        zs[seg] = dict(top=max(p[2].z for p in ps), bottom=min(p[1].z for p in ps), x=sum(p[3].x for p in ps) / len(ps), y=sum(p[3].y for p in ps) / len(ps))
    hip = Vector((zs['Upper']['x'], zs['Upper']['y'], zs['Upper']['top']))
    knee = Vector(((zs['Upper']['x'] + zs['Lower']['x']) / 2, (zs['Upper']['y'] + zs['Lower']['y']) / 2, (zs['Upper']['bottom'] + zs['Lower']['top']) / 2))
    ankle = Vector(((zs['Lower']['x'] + zs['Hoof']['x']) / 2, (zs['Lower']['y'] + zs['Hoof']['y']) / 2, (zs['Lower']['bottom'] + zs['Hoof']['top']) / 2))
    toe = Vector((zs['Hoof']['x'], zs['Hoof']['y'], zs['Hoof']['bottom']))
    return hip, knee, ankle, toe


BONES = [
    # name, parent, head, tail
    ('Hips', None, (-0.55, 0, 1.12), (-0.2, 0, 1.18)),
    ('Spine', 'Hips', (-0.2, 0, 1.18), (0.1, 0, 1.24)),
    ('Spine1', 'Spine', (0.1, 0, 1.24), (0.38, 0, 1.4)),
    ('Spine2', 'Spine1', (0.38, 0, 1.4), (0.58, 0, 1.8)),
    ('Neck', 'Spine2', (0.58, 0, 1.8), (0.74, 0, 2.22)),
    ('Neck2', 'Neck', (0.74, 0, 2.22), (0.82, 0, 2.56)),
    ('Head', 'Neck2', (0.82, 0, 2.56), (1.05, 0, 2.72)),
    ('Ear_L', 'Head', (0.78, 0.22, 2.74), (0.6, 0.58, 2.78)),
    ('Ear_R', 'Head', (0.78, -0.22, 2.74), (0.6, -0.58, 2.78)),
    ('Jet_L', 'Spine1', (0.3, 0.19, 1.74), (0.18, 0.21, 2.0)),
    ('Jet_R', 'Spine1', (0.3, -0.19, 1.74), (0.18, -0.21, 2.0)),
    ('Plate_L', 'Spine2', (0.62, 0.55, 1.28), (0.5, 0.55, 1.7)),
    ('Plate_R', 'Spine2', (0.62, -0.55, 1.28), (0.5, -0.55, 1.7)),
]
LEG_PARENT = {'FL': 'Spine2', 'FR': 'Spine2', 'HL': 'Hips', 'HR': 'Hips'}
for leg in LEGS:
    j = joints(leg)
    if not j:
        print('no parts for leg', leg)
        continue
    hip, knee, ankle, toe = j
    BONES += [(f'{leg}_Upper', LEG_PARENT[leg], tuple(hip), tuple(knee)), (f'{leg}_Lower', f'{leg}_Upper', tuple(knee), tuple(ankle)), (f'{leg}_Hoof', f'{leg}_Lower', tuple(ankle), tuple(toe))]
    print(leg, 'hip', [round(v, 2) for v in hip], 'knee', [round(v, 2) for v in knee], 'ankle', [round(v, 2) for v in ankle], 'toe', [round(v, 2) for v in toe])

arm_data = bpy.data.armatures.new('Deer')
arm = bpy.data.objects.new('Armature', arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
names = set()
for name, parent, head, tail in BONES:
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = Vector(head), Vector(tail)
    if parent:
        b.parent = arm_data.edit_bones[parent]
    names.add(name)
bpy.ops.object.mode_set(mode='OBJECT')
# Parts for bones that do not exist (a leg without parts) fall back to the spine.
for k, v in assign.items():
    if v[0] not in names:
        assign[k] = ('Spine2', v[1], v[2], v[3])

# ---- Weights (rigid: one group per part), then one object per material (seven skins, seven draw calls) ----
counts = {}
for o in parts:
    bone = assign[o.name][0]
    vg = o.vertex_groups.new(name=bone)
    vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    counts[bone] = counts.get(bone, 0) + len(o.data.vertices)
groups = {}
for o in parts:
    groups.setdefault(o.active_material.name if o.active_material else '', []).append(o)
joined = []
for mat, objs in groups.items():
    objs.sort(key=lambda o: -len(o.data.vertices))
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = objs[0]
    # The body shell is the contract's Face (the loader measures the head's top from it).
    ob.name = 'Face' if mat == 'Material.001' else mat.replace('Material.', 'M')
    ob.parent = arm
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    joined.append(ob)
print('bones with parts:', {k: v for k, v in sorted(counts.items())})
print('fused (no parts of their own):', [n for n in names if n not in counts])

# ---- The clips -----------------------------------------------------------------------------
pose = arm.pose.bones
rest = {b.name: b.matrix_local.to_3x3() for b in arm_data.bones}
for pb in pose.values():
    pb.rotation_mode = 'QUATERNION'


def key(action, frame, bone, rx=0.0, ry=0.0, rz=0.0, loc=(0, 0, 0)):
    """World-axis rotations (degrees: x roll, y pitch, z yaw) and a world translation, keyed on the bone at `frame`."""
    W = Matrix.Rotation(math.radians(rz), 3, 'Z') @ Matrix.Rotation(math.radians(ry), 3, 'Y') @ Matrix.Rotation(math.radians(rx), 3, 'X')
    R = rest[bone]
    pb = pose[bone]
    pb.rotation_quaternion = (R.inverted() @ W @ R).to_quaternion()
    pb.location = R.inverted() @ Vector(loc)
    pb.keyframe_insert('rotation_quaternion', frame=frame)
    pb.keyframe_insert('location', frame=frame)


def make_action(name, frames, fn):
    act = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = act
    for f in range(frames + 1):
        fn(f, f / frames)
    for fc in act.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'
    arm.animation_data.action = None
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 1, act)
    strip.name = name
    return act


S = math.sin
TAU = math.pi * 2
PHASE = {'FL': 0.0, 'HR': 0.0, 'FR': 0.5, 'HL': 0.5}
BOB = 0.033  # 1 % of her 3.3 m


def walk(f, t):
    for leg, ph in PHASE.items():
        if f'{leg}_Upper' not in names:
            continue
        a = TAU * (t + ph)
        swing = max(0.0, S(a))                       # the leg is off the ground over the first half of its cycle
        key('Walk', f, f'{leg}_Upper', ry=-14 * S(a))
        key('Walk', f, f'{leg}_Lower', ry=22 * swing * S(a + 0.6) if S(a) > 0 else 4 * S(a))
        key('Walk', f, f'{leg}_Hoof', ry=-10 * swing)
    bob = BOB * S(2 * TAU * t)
    key('Walk', f, 'Hips', ry=1.2 * S(2 * TAU * t), loc=(0, 0, bob))
    key('Walk', f, 'Spine1', ry=0.8 * S(2 * TAU * t + 0.5))
    # The head holds its line: the neck counters the bob, the head the neck.
    key('Walk', f, 'Neck', ry=-2.5 * S(2 * TAU * t))
    key('Walk', f, 'Head', ry=1.5 * S(2 * TAU * t + 0.4), loc=(0, 0, -0.6 * bob))
    for side, sg in (('L', 1), ('R', -1)):
        key('Walk', f, f'Plate_{side}', rx=4 * sg * S(2 * TAU * t - 0.9))
        key('Walk', f, f'Jet_{side}', ry=3 * S(2 * TAU * t - 1.2))
        key('Walk', f, f'Ear_{side}', ry=5 * S(2 * TAU * t - 1.4), rz=2 * sg * S(TAU * t))


def idle(f, t):
    shift = S(TAU * t)
    key('Idle', f, 'Hips', rx=1.5 * shift, loc=(0, 0.012 * shift, 0.004 * S(2 * TAU * t)))
    key('Idle', f, 'Spine1', rx=0.8 * shift)
    look = 8 * S(TAU * t * 0.5 + 0.3)
    key('Idle', f, 'Neck', rz=0.3 * look, ry=1.0 * S(TAU * t))
    key('Idle', f, 'Head', rz=look, ry=2 * S(TAU * t + 1.0))
    # The ear flicks: 1.2 s and 2.6 s, a quarter second each, one ear then the other.
    def flick(at, w=0.25):
        d = (t * 3.0 - at) / w
        return S(math.pi * d) if 0 < d < 1 else 0.0
    key('Idle', f, 'Ear_L', rx=18 * flick(1.2), ry=2 * shift)
    key('Idle', f, 'Ear_R', rx=-18 * flick(2.6), ry=2 * shift)
    for side, sg in (('L', 1), ('R', -1)):
        key('Idle', f, f'Plate_{side}', rx=1.2 * sg * shift)
        key('Idle', f, f'Jet_{side}', ry=0.8 * S(TAU * t + 0.7))
    for leg in PHASE:
        if f'{leg}_Upper' in names:
            key('Idle', f, f'{leg}_Upper', ry=0.6 * shift * (1 if leg[0] == 'F' else -1))


make_action('Walk', FPS, walk)
make_action('Idle', FPS * 3, idle)

# ---- Export --------------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animation_mode='NLA_TRACKS', export_image_format='AUTO', export_apply=False, export_yup=True, export_skins=True, export_def_bones=False, export_optimize_animation_size=False, use_selection=True)
print('wrote', OUT)
