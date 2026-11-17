/*
 * CG_1: cara 2D hecha con triangulos
 * Objetivo 1: modelo de la cara, dibujado estatico al centro
 *
 * Patricio Carreras Báez, A01754749
 * 2026-11-10
 */

'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { V2, M3, type Mat3 } from '../libs/2d-lib.js';

// Shaders en archivos separados
import vsGLSL from './vs_cara.glsl?raw';
import fsGLSL from './fs_cara.glsl?raw';

// Colores (RGBA)
// La cara lleva alpha 0: asi el shader sabe que debe usar el color de lil-gui
const AMARILLO = [1.0, 0.85, 0.1, 0];
const NEGRO = [0.1, 0.1, 0.1, 1];
const ROJO = [0.7, 0.1, 0.1, 1];

// Valores que se cambian con lil-gui
const datosCara = {
    t: { x: 0, y: 0 },          // traslacion
    rr: { z: 0 },               // rotacion en radianes
    s: { x: 1, y: 1 },          // escala
    color: [1.0, 0.85, 0.1, 1], // color de la cara
};
const datosPivote = {
    t: { x: 0, y: 0 },          // traslacion
};

// Genera la cara alrededor del punto (0, 0)
function cara(radio: number): twgl.Arrays {
    const positionData: number[] = [];
    const colorData: number[] = [];
    const indexData: number[] = [];

    // --- Cara: poligono de 20 lados ---
    const lados = 20;

    // Vertice 0: el centro
    positionData.push(0, 0);
    colorData.push(...AMARILLO);

    // Vertices del borde, con coordenadas polares
    for (let i = 0; i < lados; i++) {
        const angulo = (2 * Math.PI * i) / lados;
        positionData.push(radio * Math.cos(angulo), radio * Math.sin(angulo));
        colorData.push(...AMARILLO);
    }

    // Un triangulo por lado: centro, vertice actual y el siguiente
    for (let i = 0; i < lados; i++) {
        const actual = 1 + i;
        const siguiente = 1 + ((i + 1) % lados);
        indexData.push(0, actual, siguiente);
    }

    // --- Ojos: un triangulo cada uno ---
    // Ojo izquierdo
    let inicio = positionData.length / 2;
    positionData.push(-0.45 * radio, 0.15 * radio);
    positionData.push(-0.15 * radio, 0.15 * radio);
    positionData.push(-0.30 * radio, 0.50 * radio);
    colorData.push(...NEGRO, ...NEGRO, ...NEGRO);
    indexData.push(inicio, inicio + 1, inicio + 2);

    // Ojo derecho
    inicio = positionData.length / 2;
    positionData.push(0.15 * radio, 0.15 * radio);
    positionData.push(0.45 * radio, 0.15 * radio);
    positionData.push(0.30 * radio, 0.50 * radio);
    colorData.push(...NEGRO, ...NEGRO, ...NEGRO);
    indexData.push(inicio, inicio + 1, inicio + 2);

    // --- Boca: medio circulo hacia abajo (sonrisa) ---
    const ladosBoca = 10;
    const radioBoca = 0.55 * radio;
    const centroBocaY = -0.15 * radio;

    // Centro de la boca
    inicio = positionData.length / 2;
    positionData.push(0, centroBocaY);
    colorData.push(...ROJO);

    // Vertices de la boca, de 180 a 360 grados
    for (let i = 0; i <= ladosBoca; i++) {
        const angulo = Math.PI + (Math.PI * i) / ladosBoca;
        positionData.push(radioBoca * Math.cos(angulo),
                          centroBocaY + radioBoca * Math.sin(angulo));
        colorData.push(...ROJO);
    }

    for (let i = 0; i < ladosBoca; i++) {
        indexData.push(inicio, inicio + 1 + i, inicio + 2 + i);
    }

    // Objeto final con los arreglos
    const arrays: twgl.Arrays = {
        a_position: { numComponents: 2, data: positionData },
        a_color:    { numComponents: 4, data: colorData },
        indices:    { numComponents: 3, data: indexData },
    };

    return arrays;
}

// Genera el pivote: un rombo gris centrado en (0, 0)
function pivote(tamano: number): twgl.Arrays {
    const arrays: twgl.Arrays = {
        a_position: {
            numComponents: 2,
            data: [
                tamano, 0,    // derecha
                0, tamano,    // arriba
                -tamano, 0,   // izquierda
                0, -tamano,   // abajo
            ]
        },
        a_color: {
            numComponents: 4,
            data: [
                0.6, 0.6, 0.6, 1,
                0.6, 0.6, 0.6, 1,
                0.6, 0.6, 0.6, 1,
                0.6, 0.6, 0.6, 1,
            ]
        },
        indices: {
            numComponents: 3,
            // Dos triangulos forman el rombo
            data: [
                0, 1, 2,
                2, 3, 0,
            ]
        }
    };

    return arrays;
}

function main(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No canvas element found in the document');
    }
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        throw new Error('WebGL2 is not supported by this browser');
    }

    const programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

    // Cara: su propio buffer y VAO
    const caraBuffer = twgl.createBufferInfoFromArrays(gl, cara(150));
    const caraVao = twgl.createVAOFromBufferInfo(gl, programInfo, caraBuffer);

    // Pivote: otro buffer y otro VAO, con el mismo programInfo
    const pivoteBuffer = twgl.createBufferInfoFromArrays(gl, pivote(30));
    const pivoteVao = twgl.createVAOFromBufferInfo(gl, programInfo, pivoteBuffer);

    if (!caraVao || !pivoteVao) {
        throw new Error('No se pudo crear el VAO');
    }

    // Ajustar el canvas antes de calcular las posiciones iniciales
    twgl.resizeCanvasToDisplaySize(canvas);

    // Posiciones iniciales: la cara al centro y el pivote 250 px a la izquierda
    datosCara.t.x = gl.canvas.width / 2;
    datosCara.t.y = gl.canvas.height / 2;
    datosPivote.t.x = gl.canvas.width / 2 - 250;
    datosPivote.t.y = gl.canvas.height / 2;

    setupUI(gl);

    // Dibujar en cada frame
    const frame = (): void => {
        drawScene(gl, programInfo, caraVao, caraBuffer, pivoteVao, pivoteBuffer);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

// Menu de lil-gui, con la misma estructura de la actividad
function setupUI(gl: WebGL2RenderingContext): void {
    const gui = new GUI();

    const modelFolder = gui.addFolder('Model');

    const traFolder = modelFolder.addFolder('Translation');
    traFolder.add(datosCara.t, 'x', 0, gl.canvas.width);
    traFolder.add(datosCara.t, 'y', 0, gl.canvas.height);

    const rotFolder = modelFolder.addFolder('Rotation');
    rotFolder.add(datosCara.rr, 'z', 0, Math.PI * 2);

    const scaFolder = modelFolder.addFolder('Scale');
    scaFolder.add(datosCara.s, 'x', -5, 5);
    scaFolder.add(datosCara.s, 'y', -5, 5);

    const colorFolder = modelFolder.addFolder('Color');
    colorFolder.addColor(datosCara, 'color');

    const pivotFolder = gui.addFolder('Pivot');
    const pivotTraFolder = pivotFolder.addFolder('Translation');
    pivotTraFolder.add(datosPivote.t, 'x', 0, gl.canvas.width);
    pivotTraFolder.add(datosPivote.t, 'y', 0, gl.canvas.height);
}

// Matriz de la cara. El orden de las transformaciones solo esta aqui.
function matrizCara(): Mat3 {
    const posPivote = V2.create(datosPivote.t.x, datosPivote.t.y);

    const escala = M3.scale(V2.create(datosCara.s.x, datosCara.s.y));
    const traslacion = M3.translation(V2.create(datosCara.t.x, datosCara.t.y));
    const pivoteAlOrigen = M3.translation(V2.scale(posPivote, -1));
    const rotacion = M3.rotation(datosCara.rr.z);
    const origenAlPivote = M3.translation(posPivote);

    // Cada multiply pone la nueva matriz a la izquierda,
    // asi que se aplican en este orden, de arriba hacia abajo:
    let m = M3.identity();
    m = M3.multiply(escala, m);          // 1. escala (sobre el centro de la cara)
    m = M3.multiply(traslacion, m);      // 2. traslacion
    m = M3.multiply(pivoteAlOrigen, m);  // 3. rotacion alrededor del pivote:
    m = M3.multiply(rotacion, m);        //    llevar el pivote al origen, rotar
    m = M3.multiply(origenAlPivote, m);  //    y regresar
    return m;
}

// Dibuja la cara y el pivote con sus matrices
function drawScene(
    gl: WebGL2RenderingContext,
    programInfo: twgl.ProgramInfo,
    caraVao: WebGLVertexArrayObject,
    caraBuffer: twgl.BufferInfo,
    pivoteVao: WebGLVertexArrayObject,
    pivoteBuffer: twgl.BufferInfo,
): void {
    // El canvas es el del HTML, no uno offscreen
    twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(programInfo.program);

    // --- Cara ---
    gl.bindVertexArray(caraVao);
    twgl.setUniforms(programInfo, {
        u_resolution: [gl.canvas.width, gl.canvas.height],
        u_transforms: matrizCara(),
        u_color: datosCara.color,
    });
    twgl.drawBufferInfo(gl, caraBuffer);

    // --- Pivote: solo traslacion ---
    const matrizPivote = M3.translation(V2.create(datosPivote.t.x, datosPivote.t.y));

    gl.bindVertexArray(pivoteVao);
    twgl.setUniforms(programInfo, {
        u_resolution: [gl.canvas.width, gl.canvas.height],
        u_transforms: matrizPivote,
    });
    twgl.drawBufferInfo(gl, pivoteBuffer);
}

main()
