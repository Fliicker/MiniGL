#version 300 es

precision highp float;

in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;
in vec2 v_texcoord;

uniform vec3 u_reverseLightDirection;
uniform vec4 u_color;
uniform float u_shininess;    // 高光亮度
uniform sampler2D u_texture;  // 纹理

out vec4 outColor;

void main() {
  // Just set the output to a constant redish-purple
  // outColor = vec4(1, 0, 0.5, 1);

  // 物体性质
  vec3 ka = vec3(0.2f, 0.9f, 0.0f);   // 环境光反射系数
  vec3 kd = vec3(0.3f, 0.3f, 0.3f);   // 漫反射系数
  vec3 ks = vec3(0.9f, 0.9f, 0.9f);   // 镜面反射系数

  float I = 40000.0f;  // 漫反射、镜面反射光源强度
  float Ia = 0.35f;    // 环境光源强度

  // 因为 v_normal 是一个变化的插值所以它不会是一个单位向量。 归一化使它成为单位向量
  vec3 normal = normalize(v_normal);

  vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

  float r = length(v_surfaceToLight);
  // 通过取法线与光线反向的点积计算光
  // float light = dot(v_normal, u_reverseLightDirection);
  vec3 ambient = ka * Ia;
  vec3 diffuse = kd * (I / (r * r)) * max(dot(normal, surfaceToLightDirection), 0.0f);
  vec3 specular = ks * (I / (r * r)) * pow(max(dot(normal, halfVector), 0.0f), u_shininess);

  // outColor = vec4(ambient + diffuse + specular, 1.0f);

  outColor = texture(u_texture, v_texcoord);    // 在纹理上找到对应的颜色
  outColor += vec4( diffuse + specular, 1.0f);
}