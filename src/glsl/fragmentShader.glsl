#version 300 es

precision highp float;

in vec3 v_normal;

in vec4 v_color;    // 接收从顶点着色器输出的颜色属性(变量名相同)

uniform vec3 u_reverseLightDirection;
uniform vec4 u_color;

out vec4 outColor;

void main() {
  // Just set the output to a constant redish-purple
  // outColor = vec4(1, 0, 0.5, 1);

  // 因为 v_normal 是一个变化的插值所以它不会是一个单位向量。 归一化使它成为单位向量
  vec3 normal = normalize(v_normal);
 
  // 通过取法线与光线反向的点积计算光
  float light = dot(normal, u_reverseLightDirection);
 
  // outColor = v_color;
  outColor = u_color;

  // 只将颜色部分乘以光
  outColor.rgb *= light;
}