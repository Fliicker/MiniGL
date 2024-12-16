import { bearing } from "@turf/turf";
import m4 from "./matrix4";

export default class ControlCenter {

  isDraggingA = false;  // 左键拖动
  isDraggingB = false;  // 中键拖动
  clientHeight = 0;
  clientHeight = 0;

  modelState = {
    translation: [0, 0, 0],
    rotation: [0, 0, 0],
  };

  cameraState = {
    position: [0, 0, 0],    //  TODO: 由地图中心和zoom解算
    up: [0, 1, 0],
    target: [0, 0, 0],
    direction: [0, 0, 1]
  };

  viewState = {
    pitch: 60,
    bearing: 0,
    z: 0,
    center: [0, 0]
  }

  perspectiveState = {
    fov: this.degToRad(60),
    near: 10,
    far: 200,
  }

  modelMatrix = m4.identity();
  viewMatrix = m4.identity();
  projectionMatrix = m4.identity();

  constructor(_clientWidth, _clientHeight) {
    this.clientWidth = _clientWidth;
    this.clientHeight = _clientHeight;
  }

  updateModelMatrix() {
    let _modelMatrix = m4.translation(...this.modelState.translation);
    // modelMatrix = m4.multiply(modelMatrix, rotationTrackball);
    _modelMatrix = m4.xRotate(_modelMatrix, this.modelState.rotation[0]);
    _modelMatrix = m4.yRotate(_modelMatrix, this.modelState.rotation[1]);
    this.modelMatrix = m4.zRotate(_modelMatrix, this.modelState.rotation[2]);
  }

  updateCameraMatrix() {
    this.calcCameraState();
    console.log(this.cameraState)
    // let cameraMatrix = m4.lookAtByDirection(this.cameraState.position, this.cameraState.direction, this.cameraState.up);
    let cameraMatrix = m4.lookAt(this.cameraState.position, this.cameraState.target, this.cameraState.up);
    this.viewMatrix = m4.inverse(cameraMatrix);
  }

  updateProjectionMatrix() {
    this.projectionMatrix = m4.perspective(
      this.perspectiveState.fov,
      this.clientWidth / this.clientHeight,
      this.perspectiveState.near,
      this.perspectiveState.far
    );
  }

  updateAllMatrix() {
    this.updateModelMatrix();
    this.updateCameraMatrix();
    this.updateProjectionMatrix();
  }

  // 根据视角信息计算相机信息
  calcCameraState() {
    let bearing = this.degToRad(this.viewState.bearing);
    let pitch = this.degToRad(this.viewState.pitch);
    let dx = this.viewState.z * Math.sin(bearing) * Math.cos(bearing) / Math.sin(-pitch);
    let dy = this.viewState.z / Math.tan(pitch);

    this.cameraState.position = [this.viewState.center[0] + dx, this.viewState.center[1] + dy, this.viewState.z];
    this.cameraState.target = [this.viewState.center[0], this.viewState.center[1], 0];
  }

  get mvpMatrix() {
    let vpMatrix = m4.multiply(this.projectionMatrix, this.viewMatrix);
    let mvpMat = m4.multiply(vpMatrix, this.modelMatrix);
    return mvpMat
  }

  degToRad(d) {
    return (d * Math.PI) / 180;
  }

  handleKeyDown(e) {
    if (e.ctrlKey) {
      this.handleCtrlKey(e.key);
    } else if (e.shiftKey) {
      this.handleShiftKey(e.key);
    } else {
      this.handleRegularKey(e.key);
    }
  }

  initEvents(cb) {
    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.isDraggingA = true;
      }
      if (e.button === 1) {
        this.isDraggingB = true;
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0 && this.isDraggingA) {
        this.isDraggingA = false;
      }
      if (e.button === 1 && this.isDraggingB) {
        this.isDraggingB = false;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isDraggingA) {
        // ndc空间的位移量计算
        let dx = e.movementX / this.clientWidth;
        let dy = -e.movementY / this.clientHeight;
        let inverseProjectionMatrix = m4.inverse(this.projectionMatrix);
        let transposeViewMatrix = m4.transpose(this.viewMatrix)
        let viewRotationMatrix = m4.removeTranslation(transposeViewMatrix)
        let inverseMatrix = m4.multiply(viewRotationMatrix, inverseProjectionMatrix)
        let translateOnView = m4.multiplyMatrixVector(inverseMatrix, [dx, dy, 0, 0.15])   // TODO: 如何实现精确解算?
        this.cameraState.position[0] += translateOnView[0] / translateOnView[2];
        this.cameraState.position[1] += translateOnView[1] / translateOnView[2];
        console.log(translateOnView);
        cb()
      }
      if (this.isDraggingB) {
        let dx = e.movementX;
        let dy = -e.movementY;
        this.viewState.bearing -= this.degToRad(5 * dx)
        this.viewState.pitch += this.degToRad(5 * dy)
        this.calcCameraState()
        cb()
      }
    });
  }
}