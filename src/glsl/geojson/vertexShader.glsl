#version 300 es

layout(location = 0) in vec3 a_position;

uniform mat4 u_mvpMatrix;
uniform mat4 u_model;
uniform mat4 u_modelInverseTranspose;
uniform vec3 u_lightWorldPosition;
uniform vec3 u_viewWorldPosition;

out vec3 v_normal;
out vec3 v_surfaceToLight;    // 从表面到光源的矢量
out vec3 v_surfaceToView;
// out vec2 v_texcoord;

void main() {

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0f);

  v_normal = mat3(u_modelInverseTranspose) * vec3(0, 0, 1);
  vec3 surfaceWorldPosition = (u_model * vec4(a_position, 1.0f)).xyz;
  v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;
  v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;

}