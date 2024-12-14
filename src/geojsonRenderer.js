import vertexShaderSource from "./glsl/geojson/vertexShader.glsl?raw";
import fragmentShaderSource from "./glsl/geojson/fragmentShader.glsl?raw";
import m3 from "./matrix3.js";
import m4 from "./matrix4.js";
import axios from "axios";
import * as turf from "@turf/turf";

let canvas = document.getElementById("c");
/** @type {WebGL2RenderingContext} */
const gl = canvas.getContext("webgl2");

const modelStates = {
  translation: [0, 0, 0],
  rotation: [0, 0, 0],
};

const cameraStates = {
  position: [0, 0, 0],
  up: [0, 1, 0],
  target: [0, 0, 0],
};

const perspectiveStates = {
  fov: degToRad(60),
  near: 0.1,
  far: 20,
}

let pointCount = 0
let program;

const main = async () => {
  const geojson = (await axios.get("/geojson/China.json")).data;
  let flag = false;
  turf.featureEach(geojson, (polygon) => {
    if (flag) return
    const array = polygonToArray(polygon);
    const center = turf.center(polygon).geometry.coordinates;

    cameraStates.position = [center[0], center[1], 2];
    cameraStates.target = [center[0], center[1], 0];
    pointCount = array.length / 3;

    let vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    let fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    program = createProgram(gl, vs, fs);

    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    drawScene();
    flag = true
  });
};

window.addEventListener("keydown", handleKeyDown, true);

function drawScene() {
  resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  gl.useProgram(program);

  let projectionMatrix = m4.perspective(
    perspectiveStates.fov,
    gl.canvas.clientWidth / gl.canvas.clientHeight,
    perspectiveStates.near,
    perspectiveStates.far
  );

  let cameraMatrix = m4.lookAt(cameraStates.position, cameraStates.target, cameraStates.up);
  let viewMatrix = m4.inverse(cameraMatrix);

  let modelMatrix = m4.translation(...modelStates.translation);
  // modelMatrix = m4.multiply(modelMatrix, rotationTrackball);
  modelMatrix = m4.xRotate(modelMatrix, modelStates.rotation[0]);
  modelMatrix = m4.yRotate(modelMatrix, modelStates.rotation[1]);
  modelMatrix = m4.zRotate(modelMatrix, modelStates.rotation[2]);

  let vpMatrix = m4.multiply(projectionMatrix, viewMatrix);
  let mvpMatrix = m4.multiply(vpMatrix, modelMatrix);

  let matrixLocation = gl.getUniformLocation(program, "u_mvpMatrix");
  gl.uniformMatrix4fv(matrixLocation, false, mvpMatrix);

  gl.drawArrays(gl.TRIANGLES, 0, pointCount)
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



main();
