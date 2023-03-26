import { WebGLRenderer, Scene, PerspectiveCamera, Vector3, MOUSE } from "three";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { addGeoObject, initSVGObject } from "./svgGraphic";
import Stats from "three/addons/libs/stats.module.js";

export class ThreeEngine {
  container = null; // 挂载的 DOM
  scene = null; // 场景
  constructor(container) {
    // 创建渲染器
    let renderer = new WebGLRenderer({
      antialias: true, // 开启抗锯齿
    });
    container.appendChild(renderer.domElement); // 将渲染器挂载到dom
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.offsetWidth, container.offsetHeight, true);
    let scene = new Scene(); // 实例化场景
    // 实例化相机
    let camera = new PerspectiveCamera(
      45,
      container.offsetWidth / container.offsetHeight,
      1,
      1000
    );
    camera.position.set(3, 3, 4); // 设置相机位置
    camera.lookAt(new Vector3(0, 0, 0)); // 设置相机看先中心点
    camera.up = new Vector3(0, 1, 0); // 设置相机自身方向
    // camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    const group = new THREE.Group();
    scene.add(group);
    const { arcs,pieSvgDataUri } = initSVGObject();
    addGeoObject(group, arcs,pieSvgDataUri);

    this.container = container;
    this.scene = scene;

    let orbitControls = new OrbitControls(camera, renderer.domElement);

    let stats = new Stats();
    container.appendChild(stats.dom);

    renderer.render(scene, camera); // 渲染器渲染场景和相机
    renderer.setClearColor(0x1f2937, 1); //设置背景颜色
    let onWindowResize = () => {
      // console.log('dede',window)
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onWindowResize);

    // 逐帧渲染threejs
    let animate = () => {
      renderer.render(scene, camera); // 渲染器渲染场景和相机
      requestAnimationFrame(animate);
      stats.update();
    };
    animate();
  }
  /**
   * 向场景中添加模型
   * @param  {...any} object 模型列表
   */
  addObject(...object) {
    object.forEach((elem) => {
      this.scene.add(elem); // 场景添加模型
    });
  }
}