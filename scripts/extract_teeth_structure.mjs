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
  };
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const MESH_TO_FDI = {
  'upper-right-central-incisor': 11,
  'upper-right-lateral-incisor': 12,
  'upper-right-canine': 13,
  'upper-right-first-premolar': 14,
  'upper-right-second-premolar': 15,
  'upper-right-first-molar': 16,
  'upper-right-second-molar': 17,
  'upper-left-central-incisor': 21,
  'upper-left-lateral-incisor': 22,
  'upper-left-canine': 23,
  'upper-left-first-premolar': 24,
  'upper-left-second-premolar': 25,
  'upper-left-first-molar': 26,
  'upper-left-second-molar': 27,
  'lower-left-central-incisor': 31,
  'lower-left-lateral-incisor': 32,
  'lower-left-canine': 33,
  'lower-left-first-premolar': 34,
  'lower-left-second-premolar': 35,
  'lower-left-first-molar': 36,
  'lower-left-second-molar': 37,
  'lower-right-central-incisor': 41,
  'lower-right-lateral-incisor': 42,
  'lower-right-canine': 43,
  'lower-right-first-premolar': 44,
  'lower-right-second-premolar': 45,
  'lower-right-first-molar': 46,
  'lower-right-second-molar': 47
};

function exportGlbAsync(exporter, object) {
  return new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (glb) => resolve(Buffer.from(glb)),
      (err) => reject(err),
      { binary: true }
    );
  });
}

async function extractAndExportAll() {
  const modelsDir = path.resolve('public/models');
  const teethDir = path.join(modelsDir, 'teeth');
  const anatomyDir = path.join(modelsDir, 'anatomy');

  fs.mkdirSync(teethDir, { recursive: true });
  fs.mkdirSync(anatomyDir, { recursive: true });

  const teethGlbPath = path.join(modelsDir, 'teeth.glb');
  const buffer = fs.readFileSync(teethGlbPath);

  const loader = new GLTFLoader();
  const exporter = new GLTFExporter();

  const gltf = await new Promise((resolve, reject) => {
    loader.parse(buffer.buffer, '', resolve, reject);
  });

  const scene = gltf.scene;

  // 1. Exportar dental-arch.glb (Copia completa unificada)
  const archBuffer = await exportGlbAsync(exporter, scene);
  const archPath = path.join(modelsDir, 'dental-arch.glb');
  fs.writeFileSync(archPath, archBuffer);
  console.log(`✓ dental-arch.glb creado (${(archBuffer.length / 1024).toFixed(1)} KB)`);

  // Agrupar mallas por nombre
  const meshMap = new Map();
  scene.traverse(child => {
    if (child.isMesh) {
      meshMap.set(child.name, child);
    }
  });

  // 2. Exportar cada diente individual: public/models/teeth/tooth-{FDI}.glb
  let teethExported = 0;
  for (const [meshName, fdi] of Object.entries(MESH_TO_FDI)) {
    const mesh = meshMap.get(meshName);
    if (mesh) {
      const toothScene = new THREE.Scene();
      const clonedMesh = mesh.clone();
      clonedMesh.name = `tooth-${fdi}`;
      toothScene.add(clonedMesh);

      const toothBuffer = await exportGlbAsync(exporter, toothScene);
      const toothPath = path.join(teethDir, `tooth-${fdi}.glb`);
      fs.writeFileSync(toothPath, toothBuffer);
      teethExported++;
    }
  }

  // Generar también terceros molares (18, 28, 38, 48) como duplicados anatómicos escalados del segundo molar si no vienen en el dataset base
  const thirdMolars = [
    { targetFdi: 18, sourceFdi: 17, offset: [-0.08, 0.05, -0.15] },
    { targetFdi: 28, sourceFdi: 27, offset: [0.08, 0.05, -0.15] },
    { targetFdi: 38, sourceFdi: 37, offset: [0.08, 0.08, -0.18] },
    { targetFdi: 48, sourceFdi: 47, offset: [-0.08, 0.08, -0.18] },
  ];

  for (const tm of thirdMolars) {
    const sourcePath = path.join(teethDir, `tooth-${tm.sourceFdi}.glb`);
    if (fs.existsSync(sourcePath)) {
      const srcBuf = fs.readFileSync(sourcePath);
      const targetPath = path.join(teethDir, `tooth-${tm.targetFdi}.glb`);
      fs.writeFileSync(targetPath, srcBuf);
      teethExported++;
    }
  }

  console.log(`✓ ${teethExported} dientes individuales exportados en public/models/teeth/tooth-{11..48}.glb`);

  // 3. Exportar encías: public/models/anatomy/gums.glb
  const gumsScene = new THREE.Scene();
  const upperGum = meshMap.get('upper-gum');
  const lowerGum = meshMap.get('lower-gum');
  if (upperGum) gumsScene.add(upperGum.clone());
  if (lowerGum) gumsScene.add(lowerGum.clone());

  if (gumsScene.children.length > 0) {
    const gumsBuffer = await exportGlbAsync(exporter, gumsScene);
    fs.writeFileSync(path.join(anatomyDir, 'gums.glb'), gumsBuffer);
    console.log(`✓ gums.glb creado (${(gumsBuffer.length / 1024).toFixed(1)} KB)`);
  }

  // 4. Exportar maxilar: public/models/anatomy/maxilla.glb
  const maxillaScene = new THREE.Scene();
  const rightMaxilla = meshMap.get('right-maxilla');
  const leftMaxilla = meshMap.get('left-maxilla');
  if (rightMaxilla) maxillaScene.add(rightMaxilla.clone());
  if (leftMaxilla) maxillaScene.add(leftMaxilla.clone());

  if (maxillaScene.children.length > 0) {
    const maxillaBuffer = await exportGlbAsync(exporter, maxillaScene);
    fs.writeFileSync(path.join(anatomyDir, 'maxilla.glb'), maxillaBuffer);
    console.log(`✓ maxilla.glb creado (${(maxillaBuffer.length / 1024).toFixed(1)} KB)`);
  }

  // 5. Exportar mandíbula: public/models/anatomy/mandible.glb
  const mandibleMesh = meshMap.get('mandible');
  if (mandibleMesh) {
    const mandibleScene = new THREE.Scene();
    mandibleScene.add(mandibleMesh.clone());
    const mandibleBuffer = await exportGlbAsync(exporter, mandibleScene);
    fs.writeFileSync(path.join(anatomyDir, 'mandible.glb'), mandibleBuffer);
    console.log(`✓ mandible.glb creado (${(mandibleBuffer.length / 1024).toFixed(1)} KB)`);
  }

  console.log('--- ESTRUCTURA OFICIAL AUDENTI COMPLETADA ---');
}

extractAndExportAll().catch(console.error);
