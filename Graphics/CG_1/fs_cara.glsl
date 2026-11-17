#version 300 es
precision highp float;

// Color que viene del vertex shader
in vec4 v_color;

// Color elegido en lil-gui para la cara
uniform vec4 u_color;

out vec4 outColor;

void main() {
    // El alpha del vertice dice de donde sale el color:
    //  - alpha 0 (la cara): mix() da u_color, el color de lil-gui
    //  - alpha 1 (ojos, boca, pivote): mix() da su propio color
    // Asi todo se dibuja con un solo draw y los ojos y la boca no cambian.
    outColor = mix(u_color, vec4(v_color.rgb, 1.0), v_color.a);
}
