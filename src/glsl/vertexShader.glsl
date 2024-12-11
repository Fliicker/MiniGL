#version 300 es

  // an attribute is an input (in) to a vertex shader.
  // It will receive data from a buffer
in vec3 a_position;
in vec3 a_normal;

uniform vec3 u_lightWorldPosition;
uniform vec3 u_viewWorldPosition;   // 相机位置

uniform mat4 u_model;
uniform mat4 u_mvpMatirx;
uniform mat4 u_modelInverseTranspose;

out vec3 v_normal;
out vec3 v_surfaceToLight;    // 从表面到光源的矢量
out vec3 v_surfaceToView;   

// all shaders have a main function
void main() {

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = u_mvpMatirx * vec4(a_position, 1.0f);

  v_normal = mat3(u_modelInverseTranspose) * a_normal;    // 重定向法线, 去除位移部分
  vec3 surfaceWorldPosition = (u_model * vec4(a_position, 1.0f)).xyz;
  v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;
  v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;
}