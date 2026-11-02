import fs from 'fs';
import path from 'path';

// Polyfill de FileReader para entorno Node.js
if (typeof FileReader === 'undefined') {
  global.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(buf => {
        this.result = buf;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then(buf => {
        const base64 = Buffer.from(buf).toString('base64');
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
  };
}

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Configuración de las 32 piezas dentales según sistema FDI
const TEETH_DATA = [
  // Arcada Superior (Maxilar)
  { fdi: 18, type: 'molar', t: -1.0, arch: 'upper', name: 'Tercer Molar Superior Derecho' },
  { fdi: 17, type: 'molar', t: -0.87, arch: 'upper', name: 'Segundo Molar Superior Derecho' },
  { fdi: 16, type: 'molar', t: -0.73, arch: 'upper', name: 'Primer Molar Superior Derecho' },
  { fdi: 15, type: 'premolar', t: -0.58, arch: 'upper', name: 'Segundo Premolar Superior Derecho' },
  { fdi: 14, type: 'premolar', t: -0.44, arch: 'upper', name: 'Primer Premolar Superior Derecho' },
  { fdi: 13, type: 'canine', t: -0.30, arch: 'upper', name: 'Canino Superior Derecho' },
  { fdi: 12, type: 'lateral', t: -0.17, arch: 'upper', name: 'Incisivo Lateral Superior Derecho' },
  { fdi: 11, type: 'central', t: -0.06, arch: 'upper', name: 'Incisivo Central Superior Derecho' },
  { fdi: 21, type: 'central', t: 0.06, arch: 'upper', name: 'Incisivo Central Superior Izquierdo' },
  { fdi: 22, type: 'lateral', t: 0.17, arch: 'upper', name: 'Incisivo Lateral Superior Izquierdo' },
  { fdi: 23, type: 'canine', t: 0.30, arch: 'upper', name: 'Canino Superior Izquierdo' },
  { fdi: 24, type: 'premolar', t: 0.44, arch: 'upper', name: 'Primer Premolar Superior Izquierdo' },
  { fdi: 25, type: 'premolar', t: 0.58, arch: 'upper', name: 'Segundo Premolar Superior Izquierdo' },
  { fdi: 26, type: 'molar', t: 0.73, arch: 'upper', name: 'Primer Molar Superior Izquierdo' },
  { fdi: 27, type: 'molar', t: 0.87, arch: 'upper', name: 'Segundo Molar Superior Izquierdo' },
  { fdi: 28, type: 'molar', t: 1.0, arch: 'upper', name: 'Tercer Molar Superior Izquierdo' },

  // Arcada Inferior (Mandíbula)
  { fdi: 48, type: 'molar', t: -1.0, arch: 'lower', name: 'Tercer Molar Inferior Derecho' },
  { fdi: 47, type: 'molar', t: -0.87, arch: 'lower', name: 'Segundo Molar Inferior Derecho' },
  { fdi: 46, type: 'molar', t: -0.73, arch: 'lower', name: 'Primer Molar Inferior Derecho' },
  { fdi: 45, type: 'premolar', t: -0.58, arch: 'lower', name: 'Segundo Premolar Inferior Derecho' },
  { fdi: 44, type: 'premolar', t: -0.44, arch: 'lower', name: 'Primer Premolar Inferior Derecho' },
  { fdi: 43, type: 'canine', t: -0.30, arch: 'lower', name: 'Canino Inferior Derecho' },
  { fdi: 42, type: 'lateral', t: -0.17, arch: 'lower', name: 'Incisivo Lateral Inferior Derecho' },
  { fdi: 41, type: 'central', t: -0.06, arch: 'lower', name: 'Incisivo Central Inferior Derecho' },
  { fdi: 31, type: 'central', t: 0.06, arch: 'lower', name: 'Incisivo Central Inferior Izquierdo' },
  { fdi: 32, type: 'lateral', t: 0.17, arch: 'lower', name: 'Incisivo Lateral Inferior Izquierdo' },
  { fdi: 33, type: 'canine', t: 0.30, arch: 'lower', name: 'Canino Inferior Izquierdo' },
  { fdi: 34, type: 'premolar', t: 0.44, arch: 'lower', name: 'Primer Premolar Inferior Izquierdo' },
  { fdi: 35, type: 'premolar', t: 0.58, arch: 'lower', name: 'Segundo Premolar Inferior Izquierdo' },
  { fdi: 36, type: 'molar', t: 0.73, arch: 'lower', name: 'Primer Molar Inferior Izquierdo' },
  { fdi: 37, type: 'molar', t: 0.87, arch: 'lower', name: 'Segundo Molar Inferior Izquierdo' },
  { fdi: 38, type: 'molar', t: 1.0, arch: 'lower', name: 'Tercer Molar Inferior Izquierdo' },
];

function getArchPosition(t, arch) {
  // Parábola dental anatómica: x = a * sin(theta), z = b * (1 - cos(theta))
  const theta = (t * Math.PI) / 2.35;
  const isUpper = arch === 'upper';
  const widthRadius = isUpper ? 2.5 : 2.35;
  const depthRadius = isUpper ? 3.0 : 2.85;

  const x = Math.sin(theta) * widthRadius;
  const z = (1 - Math.cos(theta)) * depthRadius - (depthRadius * 0.5);

  // Curva de Spee (ligera elevación hacia molares posteriores)
  const spee = Math.pow(Math.abs(t), 2) * 0.28;
  const yBase = isUpper ? 0.75 : -0.75;
  const y = isUpper ? (yBase + spee) : (yBase - spee);

  // Ángulo tangencial para orientar la cara vestibular hacia afuera
  const tangentAngle = theta;

  return { x, y, z, tangentAngle };
}

// Generador de geometría anatómica optimizada por tipo de pieza (Pocos kilobytes)
function createToothGeometry(type, isUpper) {
  let geo;

  if (type === 'central' || type === 'lateral') {
    // Corona en cuña con borde incisal
    const w = type === 'central' ? (isUpper ? 0.38 : 0.26) : (isUpper ? 0.32 : 0.28);
    const h = 0.52;
    const d = 0.28;
    geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);

    // Ajustar vértices para dar forma de cincel incisal anatómico
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      // Estrechar en el borde incisal
      if ((isUpper && py < 0) || (!isUpper && py > 0)) {
        pos.setZ(i, pz * 0.45);
      }
    }
    geo.computeVertexNormals();
  } else if (type === 'canine') {
    // Corona cuspídea con vertientes
    geo = new THREE.ConeGeometry(0.24, 0.56, 8, 2);
    if (!isUpper) {
      geo.rotateX(Math.PI);
    }
  } else if (type === 'premolar') {
    // Corona ovoide bicúspide
    geo = new THREE.CylinderGeometry(0.26, 0.23, 0.48, 8, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getZ(i);
      pos.setX(i, px * 0.9);
      pos.setZ(i, pz * 1.15); // mayor dimensión vestíbulo-lingual
    }
    geo.computeVertexNormals();
  } else {
    // Molar policúspide con tabla oclusal
    geo = new THREE.BoxGeometry(0.52, 0.46, 0.48, 2, 2, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      // Depresión oclusal central
      if (Math.abs(px) < 0.15 && Math.abs(pz) < 0.15 && ((isUpper && py < 0) || (!isUpper && py > 0))) {
        pos.setY(i, py + (isUpper ? 0.08 : -0.08));
      }
    }
    geo.computeVertexNormals();
  }

  return geo;
}

// Crear arco de encía (Gingiva)
function createGingivaMesh(arch) {
  const isUpper = arch === 'upper';
  const points = [];
  const count = 30;

  for (let i = 0; i <= count; i++) {
    const t = -1.05 + (i / count) * 2.1;
    const pos = getArchPosition(t, arch);
    points.push(new THREE.Vector3(pos.x, pos.y + (isUpper ? 0.35 : -0.35), pos.z));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 24, 0.32, 6, false);

  const mat = new THREE.MeshStandardMaterial({
    color: 0xd97584,
    roughness: 0.55,
    metalness: 0.05,
    name: `Gingiva_${arch}_Material`
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = `Gingiva_${isUpper ? 'Upper' : 'Lower'}`;
  mesh.userData = { isGingiva: true, arch };
  return mesh;
}

async function buildDentalArchScene() {
  const scene = new THREE.Scene();
  scene.name = 'Audenti_Dental_Arch_360';

  // Material de esmalte dental de alta fidelidad estética
  const enamelMaterial = new THREE.MeshStandardMaterial({
    color: 0xfcfbfa,
    roughness: 0.22,
    metalness: 0.04,
    name: 'ToothEnamelMaterial'
  });

  // Añadir cada diente como pieza independiente
  TEETH_DATA.forEach(tData => {
    const isUpper = tData.arch === 'upper';
    const pos = getArchPosition(tData.t, tData.arch);
    const crownGeo = createToothGeometry(tData.type, isUpper);

    // Malla del diente individual
    const toothMesh = new THREE.Mesh(crownGeo, enamelMaterial.clone());
    toothMesh.name = `Tooth_${tData.fdi}`;
    toothMesh.position.set(pos.x, pos.y, pos.z);

    // Orientar hacia el exterior del arco dental
    toothMesh.rotation.y = -pos.tangentAngle;

    // Metadatos médicos esenciales para el CRM y Odontograma
    toothMesh.userData = {
      fdi: tData.fdi,
      name: tData.name,
      type: tData.type,
      arch: tData.arch,
      wholeCondition: 'sano',
      surfaces: {
        vestibular: 'sano',
        lingual: 'sano',
        mesial: 'sano',
        distal: 'sano',
        oclusal: 'sano'
      }
    };

    scene.add(toothMesh);
  });

  // Añadir encías
  scene.add(createGingivaMesh('upper'));
  scene.add(createGingivaMesh('lower'));

  return scene;
}

async function exportModels() {
  const scene = await buildDentalArchScene();
  const exporter = new GLTFExporter();
  const outDir = path.resolve('public/models');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Exportar en formato GLB (Binario ultra-optimizado)
  exporter.parse(
    scene,
    (glbBuffer) => {
      const glbPath = path.join(outDir, 'dental_arch_clean.glb');
      fs.writeFileSync(glbPath, Buffer.from(glbBuffer));
      const stats = fs.statSync(glbPath);
      console.log(`GLB exportado exitosamente en: ${glbPath}`);
      console.log(`Peso del archivo GLB: ${(stats.size / 1024).toFixed(2)} KB (Ultra-ligero Elephant-Goldfish)`);
    },
    (err) => console.error('Error al exportar GLB:', err),
    { binary: true }
  );

  // 2. Exportar en formato GLTF (JSON legible para compatibilidad total)
  exporter.parse(
    scene,
    (gltfJson) => {
      const gltfPath = path.join(outDir, 'dental_arch_clean.gltf');
      fs.writeFileSync(gltfPath, JSON.stringify(gltfJson, null, 2), 'utf8');
      const stats = fs.statSync(gltfPath);
      console.log(`GLTF exportado exitosamente en: ${gltfPath}`);
      console.log(`Peso del archivo GLTF: ${(stats.size / 1024).toFixed(2)} KB`);
    },
    (err) => console.error('Error al exportar GLTF:', err),
    { binary: false, embedBuffers: true }
  );
}

exportModels();
