#version 300 es

  // an attribute is an input (in) to a vertex shader.
  // It will receive data from a buffer
  in vec3 a_position;
  in vec3 a_normal;
  uniform mat4 u_mvpMatirx;
  uniform mat4 u_modelInverseTranspose;
  out vec4 v_color;   // 输出颜色
  out vec3 v_normal;

  // all shaders have a main function
  void main() {

    // gl_Position is a special variable a vertex shader
    // is responsible for setting
    gl_Position = u_mvpMatirx * vec4(a_position, 1.0);

    // Convert from clip space to color space.
    // Clip space goes -1.0 to +1.0
    // Color space goes from 0.0 to 1.0
    v_color =  gl_Position / gl_Position.w * 0.5 + 0.5;
    // v_color = vec4(a_position)
    v_normal = mat3(u_modelInverseTranspose) * a_normal;    // 重定向法线, 去除位移部分
  }