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
  pointCount: 0,
}

let program;
let controlCenter = new ControlCenter(gl.canvas.clientWidth, gl.canvas.clientHeight);

const main = async () => {
  const geojson = (await axios.get("/geojson/China.json")).data;
  const center = turf.center(geojson).geometry.coordinates;
  const bbox = turf.bbox(geojson);
  console.log(bbox)
  controlCenter.cameraState.position = [center[0], center[1], 70];
  controlCenter.viewState.z = 100;
  controlCenter.viewState.center = center;

  let vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  let fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  program = createProgram(gl, vs, fs);

  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  let positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  modelData.vertices = getVertices(geojson)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelData.vertices), gl.STATIC_DRAW);
  modelData.pointCount = modelData.vertices.length;

  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  drawScene();

  controlCenter.initEvents(drawScene)
};

window.addEventListener("keydown", handleKeyDown, true);

function drawScene() {
  resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  gl.useProgram(program);

  controlCenter.updateAllMatrix();
  let matrixLocation = gl.getUniformLocation(program, "u_mvpMatrix");
  gl.uniformMatrix4fv(matrixLocation, false, controlCenter.mvpMatrix);
  gl.drawArrays(gl.TRIANGLES, 0, modelData.pointCount)
}

function handleKeyDown(e) {
  if (e.ctrlKey) {
    if (e.key === "ArrowUp") {
      modelStates.rotation[0] -= degToRad(1);
    }

    if (e.key === "ArrowDown") {
      modelStates.rotation[0] += degToRad(1);
    }

    if (e.key === "ArrowRight") {
      modelStates.rotation[1] += degToRad(1);
    }

    if (e.key === "ArrowLeft") {
      modelStates.rotation[1] -= degToRad(1);
    }

    if (e.key === "q") {
      modelStates.rotation[2] += degToRad(1);
    }

    if (e.key === "e") {
      modelStates.rotation[2] -= degToRad(1);
    }
  } else if (e.shiftKey) {
    if (e.key === "ArrowLeft") {
      cameraStates.position[0] -= 10;
    }

    if (e.key === "ArrowRight") {
      cameraStates.position[0] += 10;
    }
  } else {
    if (e.key === "ArrowLeft") {
      modelStates.translation[0] -= 0.05;
    }

    if (e.key === "ArrowRight") {
      modelStates.translation[0] += 0.05;
    }

    if (e.key === "ArrowUp") {
      modelStates.translation[1] += 0.05;
    }

    if (e.key === "ArrowDown") {
      modelStates.translation[1] -= 0.05;
    }
  }

  drawScene();
}

function getVertices(geojson) {
  let vertices = [];
  turf.featureEach(geojson, (polygon) => {
    const array = polygonToArray(polygon);
    vertices.push(...array)
  });

  return vertices;
}

function polygonToArray(polygon) {
  let array = [];
  let triangles = turf.tesselate(polygon);
  turf.flattenEach(triangles, (triangle) => {
    let triangleData = triangle.geometry.coordinates[0].slice(0, 3).map(coord => [...coord, 0]).flat();
    array.push(...triangleData);
  });
  
  return array;
}

function convertToMercator() {}

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
