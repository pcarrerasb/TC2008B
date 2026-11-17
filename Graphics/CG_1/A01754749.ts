/*
 * Script to draw a 2D smiley face made of triangles, and apply
 * transformations to it, rotating around a pivot
 *
 * Patricio Carreras Báez, A01754749
 * 2026-11-10
 */

'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { V2, M3, type Vec2, type Mat3 } from '../libs/2d-lib.js';
import { Scene } from '../libs/scene.js';
import { type Color } from '../libs/color.js';

// Import the shaders from external files
import vsGLSL from './vs_matrices_vcolor.glsl?raw';
import fsGLSL from './fs_vertex_color.glsl?raw';

// Radius of the face, in pixels
const FACE_RADIUS = 150;

// Options for the order in which the transforms are applied to the model
const ORDERS = [
    'scale -> translation -> rotation',
    'translation -> scale -> rotation',
    'rotation -> translation -> scale',
    'rotation -> scale -> translation',
];


/*
 * Subclass of Scene with the particular objects and settings for this program.
 * Specifies the objects that will be used, and the UI operations available.
 */
class FaceScene extends Scene {
    // Order of the transforms, selected in the UI
    order: string = ORDERS[0];

    constructor(gl: WebGL2RenderingContext) {
        super(gl, vsGLSL, fsGLSL);

        // Create the objects for this scene
        const faceColor: Color = [1.0, 0.85, 0.1, 1];
        const model = this.addObject('model', smileyFace(FACE_RADIUS, faceColor),
            faceColor);
        model.transforms.t.x = gl.canvas.width / 2;
        model.transforms.t.y = gl.canvas.height / 2;

        // The pivot starts to the left of the face
        const pivot = this.addObject('pivot', diamond(30),
            [ 0.6, 0.6, 0.6, 1]);
        pivot.transforms.t.x = gl.canvas.width / 2 - 250;
        pivot.transforms.t.y = gl.canvas.height / 2;
    }

    // Method to draw the scene.
    protected render(): void {
        const { gl, programInfo } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        // Vector to the position of the model
        const v2_trans: Vec2 = V2.create(model.transforms.t.x, model.transforms.t.y);
        const v2_scale: Vec2 = V2.create(model.transforms.s.x, model.transforms.s.y);

        // Vector to translate the pivot to the center of the world
        const v2_pivot_to_center: Vec2 = V2.create(-pivot.transforms.t.x,
                                                   -pivot.transforms.t.y);
        // Vector to translate the pivot back to its original position
        const v2_center_to_pivot: Vec2 = V2.create(pivot.transforms.t.x,
                                                   pivot.transforms.t.y);

        // Transform matrices for the model
        const scaleMatrix: Mat3 = M3.scale(v2_scale);
        const pivotToCenter: Mat3 = M3.translation(v2_pivot_to_center);
        const centerToPivot: Mat3 = M3.translation(v2_center_to_pivot);
        const rotateMatrix: Mat3 = M3.rotation(model.transforms.rr.z);
        const translateMatrix: Mat3 = M3.translation(v2_trans);

        // Rotation around an arbitrary point, as a single matrix
        let pivotRotation: Mat3 = M3.identity();
        pivotRotation = M3.multiply(pivotToCenter, pivotRotation);
        pivotRotation = M3.multiply(rotateMatrix, pivotRotation);
        pivotRotation = M3.multiply(centerToPivot, pivotRotation);

        // Create a composite transform matrix, in the order selected in the UI
        // "A -> B -> C" means A is applied first, so the matrix is C * B * A
        let modelTransforms: Mat3 = M3.identity();
        switch (this.order) {
            case 'scale -> translation -> rotation':
                modelTransforms = M3.multiply(scaleMatrix, modelTransforms);
                modelTransforms = M3.multiply(translateMatrix, modelTransforms);
                modelTransforms = M3.multiply(pivotRotation, modelTransforms);
                break;
            case 'translation -> scale -> rotation':
                modelTransforms = M3.multiply(translateMatrix, modelTransforms);
                modelTransforms = M3.multiply(scaleMatrix, modelTransforms);
                modelTransforms = M3.multiply(pivotRotation, modelTransforms);
                break;
            case 'rotation -> translation -> scale':
                modelTransforms = M3.multiply(pivotRotation, modelTransforms);
                modelTransforms = M3.multiply(translateMatrix, modelTransforms);
                modelTransforms = M3.multiply(scaleMatrix, modelTransforms);
                break;
            case 'rotation -> scale -> translation':
                modelTransforms = M3.multiply(pivotRotation, modelTransforms);
                modelTransforms = M3.multiply(scaleMatrix, modelTransforms);
                modelTransforms = M3.multiply(translateMatrix, modelTransforms);
                break;
        }

        gl.useProgram(programInfo.program);

        let uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: modelTransforms,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(model.vao);
        twgl.drawBufferInfo(gl, model.bufferInfo);

        // Transform matrices for the pivot
        const translateMatrixPivot: Mat3 = M3.translation(v2_center_to_pivot);

        // Composite transform matrix for the pivot (only translation)
        let pivotTransforms: Mat3 = M3.identity();
        pivotTransforms = M3.multiply(translateMatrixPivot, pivotTransforms);

        uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: pivotTransforms,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(pivot.vao);
        twgl.drawBufferInfo(gl, pivot.bufferInfo);
    }

    setupUI(): void {
        const { gl } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        const gui = new GUI();

        // Order in which the transforms are applied to the model
        gui.add(this, 'order', ORDERS)
            .onChange((value: string) => {
                this.order = value;
            });

        const modelFolder = gui.addFolder('Model');

        const traFolder = modelFolder.addFolder('Translation');
        traFolder.add(model.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                model.transforms.t.x = value;
            });
        traFolder.add(model.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                model.transforms.t.y = value;
            });

        const rotFolder = modelFolder.addFolder('Rotation');
        rotFolder.add(model.transforms.rr, 'z', 0, Math.PI * 2)
            .onChange((value: number) => {
                model.transforms.rr.z = value;
            });

        const scaFolder = modelFolder.addFolder('Scale');
        scaFolder.add(model.transforms.s, 'x', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.x = value;
            });
        scaFolder.add(model.transforms.s, 'y', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.y = value;
            });

        const colorFolder = modelFolder.addFolder('Color');
        colorFolder.addColor(model, 'color')
            .onChange((value: Color) => {
                model.color = value;
                // Write the new colors of the face into its color buffer
                const arrays = smileyFace(FACE_RADIUS, model.color);
                const attribs = model.bufferInfo.attribs;
                if (attribs) {
                    twgl.setAttribInfoBufferFromArray(gl, attribs.a_color, arrays.a_color);
                }
            });

        const pivotFolder = gui.addFolder('Pivot');
        const pivotTraFolder = pivotFolder.addFolder('Translation');
        pivotTraFolder.add(pivot.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                pivot.transforms.t.x = value;
            });
        pivotTraFolder.add(pivot.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                pivot.transforms.t.y = value;
            });
    }
}

/*
 * Create the arrays for a smiley face, centered at (0, 0).
 * The face is a polygon of 20 sides, with two triangular eyes and a mouth.
 * The color of the face is received as a parameter.
 */
function smileyFace(radius: number, color: Color): twgl.Arrays {
    // The arrays are initially empty
    const positionData: number[] = [];
    const colorData: number[] = [];
    const indexData: number[] = [];

    const black = [0.1, 0.1, 0.1, 1];
    const red = [0.7, 0.1, 0.1, 1];

    // --- Face: polygon with 20 sides ---
    const sides = 20;

    // Vertex 0: the center
    positionData.push(0, 0);
    colorData.push(...color);

    // Vertices on the border, using polar coordinates
    for (let i = 0; i < sides; i++) {
        const angle = (2 * Math.PI * i) / sides;
        positionData.push(radius * Math.cos(angle), radius * Math.sin(angle));
        colorData.push(...color);
    }

    // One triangle per side: center, current vertex and the next one
    for (let i = 0; i < sides; i++) {
        const current = 1 + i;
        const next = 1 + ((i + 1) % sides);
        indexData.push(0, current, next);
    }

    // --- Eyes: one triangle each ---
    // Left eye
    let start = positionData.length / 2;
    positionData.push(-0.45 * radius, 0.15 * radius);
    positionData.push(-0.15 * radius, 0.15 * radius);
    positionData.push(-0.30 * radius, 0.50 * radius);
    colorData.push(...black, ...black, ...black);
    indexData.push(start, start + 1, start + 2);

    // Right eye
    start = positionData.length / 2;
    positionData.push(0.15 * radius, 0.15 * radius);
    positionData.push(0.45 * radius, 0.15 * radius);
    positionData.push(0.30 * radius, 0.50 * radius);
    colorData.push(...black, ...black, ...black);
    indexData.push(start, start + 1, start + 2);

    // --- Mouth: half circle facing down (a smile) ---
    const mouthSides = 10;
    const mouthRadius = 0.55 * radius;
    const mouthCenterY = -0.15 * radius;

    // Center of the mouth
    start = positionData.length / 2;
    positionData.push(0, mouthCenterY);
    colorData.push(...red);

    // Vertices of the mouth, from 180 to 360 degrees
    for (let i = 0; i <= mouthSides; i++) {
        const angle = Math.PI + (Math.PI * i) / mouthSides;
        positionData.push(mouthRadius * Math.cos(angle),
                          mouthCenterY + mouthRadius * Math.sin(angle));
        colorData.push(...red);
    }

    for (let i = 0; i < mouthSides; i++) {
        indexData.push(start, start + 1 + i, start + 2 + i);
    }

    // Build the final object with the arrays for positions, colors, and indices
    const arrays: twgl.Arrays = {
        a_position: { numComponents: 2, data: positionData },
        a_color:    { numComponents: 4, data: colorData },
        indices:    { numComponents: 3, data: indexData },
    };

    return arrays;
}

/*
 * Create the arrays for a gray diamond, centered at (0, 0).
 * Used to show the position of the pivot.
 */
function diamond(size: number): twgl.Arrays {
    let arrays = {
        a_position: {
            numComponents: 2,
            data: [
                // A diamond shape
                size, 0,
                0, size,
                -size, 0,
                0, -size,
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
            data: [
                // Two triangles
                0, 1, 2,
                2, 3, 0,
            ]
        }
    };

    return arrays;
}

/*
 * Main function to initialize the WebGL context, create the scene, and set up the UI.
 */
function main(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No canvas element found in the document');
    }

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        throw new Error('WebGL2 is not supported by this browser');
    }

    const scene = new FaceScene(gl);
    scene.setupUI();
    scene.draw(0);
}

main()
