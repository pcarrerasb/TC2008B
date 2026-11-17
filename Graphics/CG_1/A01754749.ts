/*
 * CG_1: cara 2D hecha con triangulos
 * Objetivo 1: modelo de la cara, dibujado estatico al centro
 *
 * Patricio Carreras Báez, A01754749
 * 2026-11-10
 */

'use strict';

import * as twgl from 'twgl-base.js';

// Shaders en archivos separados
import vsGLSL from './vs_cara.glsl?raw';
import fsGLSL from './fs_cara.glsl?raw';

// Colores (RGBA)
const AMARILLO = [1.0, 0.85, 0.1, 1];
const NEGRO = [0.1, 0.1, 0.1, 1];
const ROJO = [0.7, 0.1, 0.1, 1];

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

    // Dibujar en cada frame
    const frame = (): void => {
        drawScene(gl, programInfo, caraVao, caraBuffer, pivoteVao, pivoteBuffer);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

// Dibuja la cara al centro y el pivote a su izquierda
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
        // El centro del canvas
        u_translation: [gl.canvas.width / 2, gl.canvas.height / 2],
    });
    twgl.drawBufferInfo(gl, caraBuffer);

    // --- Pivote ---
    gl.bindVertexArray(pivoteVao);
    twgl.setUniforms(programInfo, {
        u_resolution: [gl.canvas.width, gl.canvas.height],
        // 250 pixeles a la izquierda del centro
        u_translation: [gl.canvas.width / 2 - 250, gl.canvas.height / 2],
    });
    twgl.drawBufferInfo(gl, pivoteBuffer);
}

main()
