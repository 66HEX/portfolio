"""Render the OG mark with Blender 4.4+: blender -b -t 8 -P scripts/render-og-artwork.py.

Uses the portfolio's original SVG silhouette, with no external models or textures.
The transparent render is shared by home and article cards.
"""
import math
from pathlib import Path
import re
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Read the SVG's actual path, including its small corner transitions.
svg = (ROOT / 'src/lib/assets/hex-logo.svg').read_text()
path = re.search(r'<path d="([^"]+)"', svg).group(1)
tokens = re.findall(r'[MLHV CZ]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?', path)
tokens = [t for t in tokens if t.strip()]
points = []
i = 0
x = y = 0
while i < len(tokens):
    command = tokens[i]
    i += 1
    if command in ('M', 'L'):
        x, y = map(float, tokens[i:i+2]); i += 2
        points.append((x, y))
    elif command == 'H':
        x = float(tokens[i]); i += 1; points.append((x, y))
    elif command == 'V':
        y = float(tokens[i]); i += 1; points.append((x, y))
    elif command == 'C':
        a, b, c, d, ex, ey = map(float, tokens[i:i+6]); i += 6
        for step in range(1, 9):
            t = step / 8; u = 1 - t
            points.append((u**3*x + 3*u*u*t*a + 3*u*t*t*c + t**3*ex,
                           u**3*y + 3*u*u*t*b + 3*u*t*t*d + t**3*ey))
        x, y = ex, ey
    elif command != 'Z':
        raise ValueError(f'Unsupported SVG command: {command}')

# Remove subpixel collinear SVG samples before beveling. They otherwise create
# overlapping bevel patches, even though they do not change the silhouette.
changed = True
while changed and len(points) > 3:
    changed = False
    for j, point in enumerate(points):
        previous, following = points[j-1], points[(j+1) % len(points)]
        dx, dy = following[0]-previous[0], following[1]-previous[1]
        distance = math.hypot(dx, dy)
        if distance and abs(dx*(point[1]-previous[1])-dy*(point[0]-previous[0]))/distance < 0.015:
            points.pop(j)
            changed = True
            break

curve = bpy.data.curves.new('Original HEX silhouette', 'CURVE')
curve.dimensions = '2D'
curve.fill_mode = 'BOTH'
curve.resolution_u = 24
curve.extrude = 0.23
curve.bevel_depth = 0.07
curve.bevel_resolution = 8
spline = curve.splines.new('POLY')
spline.points.add(len(points)-1)
for point, (x, y) in zip(spline.points, points):
    point.co = ((x-12)/5.5, (12-y)/5.5, 0, 1)
spline.use_cyclic_u = True
obj = bpy.data.objects.new('HEX · machined graphite', curve)
bpy.context.collection.objects.link(obj)
obj.location = (3.65, 0.05, 0)
obj.rotation_euler = (math.radians(16), math.radians(-24), math.radians(-7))

mat = bpy.data.materials.new('Satin titanium')
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (0.055, 0.06, 0.075, 1)
bsdf.inputs['Metallic'].default_value = 0.92
bsdf.inputs['Roughness'].default_value = 0.22
curve.materials.append(mat)

def area(name, position, energy, color, size, size_y):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.color = color
    data.shape = 'RECTANGLE'
    data.size = size
    data.size_y = size_y
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = position
    light.rotation_euler = (Vector((3.3, 0, 0))-light.location).to_track_quat('-Z', 'Y').to_euler()

area('Large overhead silk', (0, 5, 5), 850, (0.88, 0.91, 1), 5, 3)
area('Vertical edge card', (7, 1, 3), 600, (0.66, 0.56, 1), 0.65, 5)
area('Low soft fill', (2, -4, 4), 28, (0.8, 0.85, 1), 4, 2)

camera_data = bpy.data.cameras.new('OG orthographic camera')
camera = bpy.data.objects.new('OG orthographic camera', camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (0, 0, 12)
camera.rotation_euler = (0, 0, 0)
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 9.52
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.samples = 192
scene.cycles.use_denoising = True
scene.world.color = (0.055, 0.055, 0.055)
scene.render.resolution_x = 1200
scene.render.resolution_y = 630
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'
scene.render.filepath = str(ROOT / 'src/lib/seo/assets/hex-studio.png')
bpy.ops.render.render(write_still=True)
