#version 300 es
in vec2 a_position;
in vec4 a_color;

out vec4 v_color;

uniform vec2 u_resolution;
uniform vec2 u_translation;

vec4 projection2D(vec2 position, vec2 resolution) {
    // Convertir de pixeles a 0.0 - 1.0
    vec2 zeroToOne = position / resolution;

    // De 0->1 a 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;

    // De 0->2 a -1->1 (clip space)
    vec2 clipSpace = zeroToTwo - 1.0;

    // No invierto Y, asi la Y positiva va hacia arriba
    return vec4(clipSpace, 0, 1);
}

void main() {
    // Mover la cara sumando la traslacion (por ahora sin matrices)
    vec2 position = a_position + u_translation;

    gl_Position = projection2D(position, u_resolution);

    // Pasar el color del vertice al fragment shader
    v_color = a_color;
}
