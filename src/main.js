import vertexShaderSource from "./glsl/vertexShader.glsl?raw";
import fragmentShaderSource from "./glsl/fragmentShader.glsl?raw";
import m3 from "./matrix3.js";
import m4 from "./matrix4.js";

let canvas = document.getElementById("c");
/** @type {WebGL2RenderingContext} */
const gl = canvas.getContext("webgl2");

// let translation = [gl.canvas.clientWidth / 2, gl.canvas.clientHeight / 2, 0];
let translation = [0, 0, 0];
let cameraPosition = [0, 0, 1000];
let rotation = [degToRad(20), degToRad(40), degToRad(0)];
let rotationTrackball = m4.identity(); // 虚拟跟踪球矩阵
// let rotation = [degToRad(10), degToRad(10), degToRad(10)];

//创建着色器实例、上传GLSL源码和编译着色器
let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
//在GPU上创建一个GLSL程序
let program = createProgram(gl, vertexShader, fragmentShader);

//告诉WebGL如何获取数据并将其提供给顶点着色器的属性
let colorLocation = gl.getUniformLocation(program, "u_color");
let matrixLocation = gl.getUniformLocation(program, "u_mvpMatirx");
let modelMatrixLocation = gl.getUniformLocation(program, "u_model");
let modelITLocation = gl.getUniformLocation(program, "u_modelInverseTranspose");
let reverseLightDirectionLocation = gl.getUniformLocation(program, "u_reverseLightDirection");
let lightPosLocation = gl.getUniformLocation(program, "u_lightWorldPosition");
let viewPosLocation = gl.getUniformLocation(program, "u_viewWorldPosition");
let shininessLocation = gl.getUniformLocation(program, "u_shininess");

let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
let normalAttributeLocation = gl.getAttribLocation(program, "a_normal");
var texcoordAttributeLocation = gl.getAttribLocation(program, "a_texcoord");

let positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); // 将该缓冲区设置为正在处理的缓冲区

// 绘制正方体
const vertices = generateCubeVertices(200);
const faces = generateCubeFaces();
const indices = generateCubeIndices(faces);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
let vao = gl.createVertexArray(); //创建属性状态集合：顶点数组对象(vao), 该对象指向顶点数据
gl.bindVertexArray(vao); //将创建的vao绑定为当前活动的VAO, 使后续所有属性的设置(如gl.vertexAttribPointer)都会记录到这个VAO中
gl.enableVertexAttribArray(positionAttributeLocation); //启用属性，使顶点着色器能访问到缓冲区的数据
//顶点属性配置, 设置属性值如何从缓存区取出数据
var size = 3; // 2 components per iteration
var type = gl.FLOAT; // the data is 32bit floats
var normalize = false; // don't normalize the data
var stride = 12; // 从一条数据到下一条数据需要跳过的字节数(为0时使用与类型和大小匹配的步幅)
var offset = 0; // 数据在缓冲区的偏移量
gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset); // 这些顶点属性会存储在当前VAO中

// 创建法线缓冲区, 将其设为当前ARRAY_BUFFER
let normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
let normals = generateCubeNormals(vertices, faces);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
gl.enableVertexAttribArray(normalAttributeLocation);
gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, false, 0, 0);

// 创建纹理缓冲区
let texcoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
let texCoords = generateTexCoords();
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
gl.enableVertexAttribArray(texcoordAttributeLocation);
gl.vertexAttribPointer(texcoordAttributeLocation, 2, gl.FLOAT, true, 0, 0);

let texture = gl.createTexture(); // 创建一个纹理
gl.activeTexture(gl.TEXTURE0 + 0); // 应用纹理单元0
gl.bindTexture(gl.TEXTURE_2D, texture);
// 用 1x1 个蓝色像素填充纹理
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA,
  1,
  1,
  0,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  new Uint8Array([0, 0, 255, 255])
);

// 异步加载图像
var image = new Image();
image.src = "./test.jpg";
image.addEventListener("load", function () {
  // 现在图像加载完成，拷贝到纹理中
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);

  drawScene();
});
// gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // 指定WebGL一次处理1个字节（默认4个）
// gl.texImage2D(
//   gl.TEXTURE_2D,
//   0,        // 最大的贴图
//   gl.RGB8,
//   3,
//   2,
//   0,
//   gl.RGB,
//   gl.UNSIGNED_BYTE,
//   new Uint8Array([0, 152, 17, 0, 99, 11, 0, 152, 17, 0, 99, 11, 0, 152, 17, 0, 99, 11])
// );

// // 设置筛选器
// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // 绘制范围比最大贴图小
// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // 在水平方向上不重复（同u）
// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // 在垂直方向上不重复（同v）

drawScene();

window.addEventListener("keydown", handleKeyDown, true);

let isDragging = false;

window.addEventListener("mousedown", (e) => {
  isDragging = true;
});

window.addEventListener("mouseup", (e) => {
  if (isDragging) {
    isDragging = false;
  }
});

window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    // let dy = -e.movementX;
    // let dx = -e.movementY;
    // let l = Math.sqrt(dx * dx + dy * dy);
    // if (l === 0) return
    // let axis = [dx / l, dy / l, 0]    // 确定旋转轴
    // let angle = l * 0.003  // 调整旋转灵敏度

    // rotationTrackball = m4.multiply(rotationTrackball, m4.rotateAroundAxis(angle, axis))
    let endX = e.clientX;
    let endY = e.clientY;
    let startX = e.clientX - e.movementX;
    let startY = e.clientY - e.movementY;
    updateTrackballMatrix(startX, startY, endX, endY);
    drawScene();
  }
});

function drawScene() {
  resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); //使视域大小适应新的画布大小

  gl.clearColor(0, 0, 0, 0);
  // 清空画布和深度缓冲
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.CULL_FACE); // 剔除背面
  gl.enable(gl.DEPTH_TEST); // 深度检测（否则会按先后顺序渲染）

  gl.useProgram(program); //运行着色器程序

  // gl.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1); 设置随机颜色
  let projectionMatrix = m4.perspective(
    degToRad(60),
    gl.canvas.clientWidth / gl.canvas.clientHeight,
    1,
    2000
  );
  // let projectionMatrix = m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 1600);
  let cameraMatrix = m4.lookAt(cameraPosition, [0, 0, 0], [0, 1, 0]);
  let viewMatrix = m4.inverse(cameraMatrix);

  let modelMatrix = m4.translation(translation[0], translation[1], translation[2]);
  modelMatrix = m4.multiply(modelMatrix, rotationTrackball);
  modelMatrix = m4.xRotate(modelMatrix, rotation[0]);
  modelMatrix = m4.yRotate(modelMatrix, rotation[1]);
  modelMatrix = m4.zRotate(modelMatrix, rotation[2]);

  let vpMatrix = m4.multiply(projectionMatrix, viewMatrix);
  let mvpMatrix = m4.multiply(vpMatrix, modelMatrix);

  let modelInverseMatrix = m4.inverse(modelMatrix);
  let modelITMatrix = m4.transpose(modelInverseMatrix);

  console.log(m4.multiplyMatrixVector(mvpMatrix, [-200, -200, -200, 1]));

  gl.uniform3fv(lightPosLocation, [0, 150, 250]);
  gl.uniform3fv(viewPosLocation, cameraPosition);
  gl.uniform4fv(colorLocation, [0.2, 1, 0.2, 1]);
  gl.uniform3fv(reverseLightDirectionLocation, m3.normalize([0.5, 0.2, 1]));
  gl.uniformMatrix4fv(matrixLocation, false, mvpMatrix); // 设置变换矩阵
  gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);
  gl.uniformMatrix4fv(modelITLocation, false, modelITMatrix); // 重定向法线
  gl.uniform1f(shininessLocation, 100);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); // 绑定索引缓存
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

  // const recVertices = setRectangle(200)
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(recVertices), gl.STATIC_DRAW);
  // let primitiveType = gl.TRIANGLES;
  // let offset2 = 0;
  // let count = 6;
  // gl.drawArrays(primitiveType, offset2, count)
}

function setRectangle(width) {
  const a = width / 2;
  const vertices = [
    2 * a,
    -a,
    2 * a,
    -2 * a,
    -a,
    -2 * a,
    -2 * a,
    -a,
    2 * a,
    -2 * a,
    -a,
    -2 * a,
    2 * a,
    -a,
    2 * a,
    2 * a,
    -a,
    -2 * a,
  ];
  return vertices;
}

function generateCubeVertices(width) {
  const a = width / 2;
  const vertices = [
    -a,
    -a,
    -a, // 0: Left bottom back
    a,
    -a,
    -a, // 1: Right bottom back
    a,
    a,
    -a, // 2: Right top back
    -a,
    a,
    -a, // 3: Left top back
    -a,
    -a,
    a, // 4: Left bottom front
    a,
    -a,
    a, // 5: Right bottom front
    a,
    a,
    a, // 6: Right top front
    -a,
    a,
    a, // 7: Left top front

    -2 * a,
    -a - 0.5,
    2 * a,
    2 * a,
    -a - 0.5,
    2 * a,
    -2 * a,
    -a - 0.5,
    -2 * a,
    2 * a,
    -a - 0.5,
    -2 * a,
    2 * a,
    -a - 0.5,
    -2 * a,
    2 * a,
    -a - 0.5,
    2 * a,
    -2 * a,
    -a - 0.5,
    -2 * a,
    -2 * a,
    -a - 0.5,
    2 * a,
  ];
  return vertices;
}

function generateCubeFaces() {
  const faces = [
    [0, 3, 1, 2], // back
    [5, 6, 4, 7], // front
    [4, 0, 5, 1], // bottom
    [6, 2, 7, 3], // top
    [4, 7, 0, 3], // left
    [1, 2, 5, 6], // right

    [8, 9, 10, 11],
    [12, 13, 14, 15],
  ];

  return faces;
}

function generateCubeIndices(faces) {
  const indices = [];
  for (const face of faces) {
    indices.push(face[0], face[1], face[2]); // Triangle 1
    indices.push(face[2], face[1], face[3]); // Triangle 2
  }
  return indices;
}

function generateTexCoords() {
  //   let texCoords = [];
  //   for (let i = 0; i < 6; i++) {
  //     texCoords = texCoords.concat([1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1]);
  //   }
  const texCoords = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
  return texCoords;
}

function generateCubeNormals(vertices, faces) {
  const normals = new Float32Array(vertices.length); // 初始化法向量数组

  // 遍历每个正方体面
  for (let i = 0; i < faces.length; i++) {
    // 获取四个顶点
    const i0 = faces[i][0];
    const i1 = faces[i][1];
    const i2 = faces[i][2];
    const i3 = faces[i][3];

    // 获取三角形三个顶点的坐标
    const v0 = vertices.slice(i0 * 3, i0 * 3 + 3);
    const v1 = vertices.slice(i1 * 3, i1 * 3 + 3);
    const v2 = vertices.slice(i2 * 3, i2 * 3 + 3);

    // 计算两个边向量
    const edge1 = m3.subtractVectors(v1, v0);
    const edge2 = m3.subtractVectors(v2, v0);

    // 计算法向量（叉积）并归一化
    const normal = m3.normalize(m3.cross(edge1, edge2));

    // 累加法向量到对应顶点的法向量中
    for (const idx of [i0, i1, i2, i3]) {
      normals[idx * 3] += normal[0];
      normals[idx * 3 + 1] += normal[1];
      normals[idx * 3 + 2] += normal[2];
    }
  }

  // 对每个顶点的法向量进行归一化
  for (let i = 0; i < normals.length; i += 3) {
    const normalized = m3.normalize([normals[i], normals[i + 1], normals[i + 2]]);
    normals[i] = normalized[0];
    normals[i + 1] = normalized[1];
    normals[i + 2] = normalized[2];
  }

  return normals;
}

function handleKeyDown(e) {
  if (e.ctrlKey) {
    if (e.key === "ArrowUp") {
      rotation[0] -= degToRad(5);
    }

    if (e.key === "ArrowDown") {
      rotation[0] += degToRad(5);
    }

    if (e.key === "ArrowRight") {
      rotation[1] += degToRad(5);
    }

    if (e.key === "ArrowLeft") {
      rotation[1] -= degToRad(5);
    }

    if (e.key === "q") {
      rotation[2] += degToRad(5);
    }

    if (e.key === "e") {
      rotation[2] -= degToRad(5);
    }
  } else if (e.shiftKey) {
    if (e.key === "ArrowLeft") {
      cameraPosition[0] -= 10;
    }

    if (e.key === "ArrowRight") {
      cameraPosition[0] += 10;
    }
  } else {
    if (e.key === "ArrowLeft") {
      translation[0] -= 10;
    }

    if (e.key === "ArrowRight") {
      translation[0] += 10;
    }

    if (e.key === "ArrowUp") {
      translation[1] += 10;
    }

    if (e.key === "ArrowDown") {
      translation[1] -= 10;
    }
  }
  drawScene();
}

// 更新虚拟跟踪球矩阵
function updateTrackballMatrix(fromX, fromY, toX, toY) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  let x1 = (2 * fromX) / width - 1;
  let y1 = 1 - (2 * fromY) / height;
  let x2 = (2 * toX) / width - 1;
  let y2 = 1 - (2 * toY) / height;
  let z1 = 0,
    z2 = 0;

  if (x1 * x1 + y1 * y1 <= 0.5) z1 = Math.sqrt(1 - x1 * x1 - y1 * y1);
  else z1 = 0.5 / Math.sqrt(x1 * x1 + y1 * y1);
  if (x2 * x2 + y2 * y2 <= 0.5) z2 = Math.sqrt(1 - x2 * x2 - y2 * y2);
  else z2 = 0.5 / Math.sqrt(x2 * x2 + y2 * y2);

  let a = [x1, y1, z1];
  let b = [x2, y2, z2];

  let axis = m3.normalize(m3.cross(a, b));
  let angle = -Math.acos(
    (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) /
      Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) /
      Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2])
  );
  rotationTrackball = m4.multiply(rotationTrackball, m4.rotateAroundAxis(angle, axis));
}

function radToDeg(r) {
  return (r * 180) / Math.PI;
}

function degToRad(d) {
  return (d * Math.PI) / 180;
}

function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

function resizeCanvasToDisplaySize(canvas) {
  // 获取浏览器显示的画布的CSS像素值
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  // 检查画布大小是否相同。
  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;

  if (needResize) {
    // 使画布大小相同
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  return needResize;
}
