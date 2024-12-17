import vertexShaderSource from "./glsl/geojson/vertexShader.glsl?raw";
import fragmentShaderSource from "./glsl/geojson/fragmentShader.glsl?raw";
import ControlCenter from "./controlCenter";
import axios from "axios";
import * as turf from "@turf/turf";
import m4 from "./matrix4.js";

let canvas = document.getElementById("c");
/** @type {WebGL2RenderingContext} */
const gl = canvas.getContext("webgl2");

const modelData = {
  vertices: null,
  lines: null,
};

let program;
let controlCenter = new ControlCenter(gl.canvas.clientWidth, gl.canvas.clientHeight);

const main = async () => {
  const geojson = (await axios.get("/geojson/China.json")).data;
  // var geojson = turf.simplify(geojsonRaw, { tolerance: 100, highQuality: false });
  const center = turf.center(geojson).geometry.coordinates;
  const bbox = turf.bbox(geojson);
  console.log(bbox);
  controlCenter.cameraState.position = [center[0], center[1], 70];
  controlCenter.viewState.z = 100;
  controlCenter.viewState.center = center;

  let vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  let fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  program = createProgram(gl, vs, fs);

  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // let positionBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  modelData.vertices = getVertices(geojson);
  modelData.lines = getLines(geojson);
  // let allData = modelData.vertices.concat(modelData.lines.flat());
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allData), gl.STATIC_DRAW);

  // gl.enableVertexAttribArray(0);
  // gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  drawScene();

  controlCenter.initEvents(drawScene);
};

function drawScene() {
  resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  gl.useProgram(program);

  controlCenter.updateAllMatrix();
  let matrixLocation = gl.getUniformLocation(program, "u_mvpMatrix");
  let modelMatrixLocation = gl.getUniformLocation(program, "u_model");
  let modelITLocation = gl.getUniformLocation(program, "u_modelInverseTranspose");
  let lightPosLocation = gl.getUniformLocation(program, "u_lightWorldPosition");
  let viewPosLocation = gl.getUniformLocation(program, "u_viewWorldPosition");
  let uDrawModeLocation = gl.getUniformLocation(program, "u_drawMode");

  gl.uniformMatrix4fv(matrixLocation, false, controlCenter.mvpMatrix);
  gl.uniformMatrix4fv(modelMatrixLocation, false, controlCenter.modelMatrix);
  gl.uniformMatrix4fv(modelITLocation, false, controlCenter.modelITMatrix);
  gl.uniform3fv(lightPosLocation, [120, 70, 250]);
  gl.uniform3fv(viewPosLocation, controlCenter.cameraState.position);

  let triangleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelData.vertices), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  gl.uniform1i(uDrawModeLocation, 0);
  gl.drawArrays(gl.TRIANGLES, 0, modelData.vertices.length / 3);

  // let lineBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelData.lines[0]), gl.STATIC_DRAW);
  // gl.enableVertexAttribArray(0);
  // gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  // gl.uniform1i(uDrawModeLocation, 1);
  // gl.lineWidth(10.0);
  // gl.drawArrays(gl.LINE_STRIP, 0, modelData.lines[0].length / 3);

  let lineBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelData.lines.flat()), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.uniform1i(uDrawModeLocation, 1);
  gl.lineWidth(10.0);

  // modelData.lines.forEach((line) => {
  //   let lineBuffer = gl.createBuffer();
  //   gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  //   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelData.lines), gl.STATIC_DRAW);
  //   gl.drawArrays(gl.LINE_STRIP, 0, line.length / 3);
  // })

  let offset = 0;
  modelData.lines.forEach((line) => {
    gl.drawArrays(gl.LINE_STRIP, offset, line.length / 3); // 绘制每条线
    offset += line.length / 3; // 更新偏移量
  });
}

function getVertices(geojson) {
  let vertices = [];
  turf.featureEach(geojson, (polygon) => {
    const array = polygonToArray(polygon);
    vertices.push(...array);
  });

  return vertices;
}

function getLines(geojson) {
  let lineArray = []
  turf.featureEach(geojson, (polygon) => {
    const lines = turf.polygonToLine(polygon);
    turf.flattenEach(lines, (line) => {
      let lineData = line.geometry.coordinates.map((coord) => [...coord, 0.01]).flat();
      lineArray.push(lineData)
    });
  });
  return lineArray
}

function polygonToArray(polygon) {
  let array = [];
  let triangles = turf.tesselate(polygon);
  turf.flattenEach(triangles, (triangle) => {
    let triangleData = triangle.geometry.coordinates[0]
      .slice(0, 3)
      .map((coord) => [...coord, 0])
      .flat();
    array.push(...triangleData);
  });

  return array;
}

function convertToMercator() { }

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

main();