#version 300 es
precision highp float;

// Color que viene del vertex shader
in vec4 v_color;

// Color elegido en lil-gui para la cara
uniform vec4 u_color;

out vec4 outColor;

void main() {
    // Los vertices con alpha 0 son la cara: usan el color de lil-gui.
    // Los de alpha 1 (ojos, boca, pivote) usan su propio color.
    outColor = mix(u_color, vec4(v_color.rgb, 1.0), v_color.a);
}
