import * as THREE from "three";
import * as d3 from "d3";
// import TWEEN from '@tweenjs/tween.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js';

import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { CSMHelper } from 'three/examples/jsm/csm/CSMHelper.js';




import tag from './textures/tag.png'

// 墨卡托投影转换
const projection = d3.geoMercator().center([104.0, 37.5]).scale(80).translate([0, 0]);

// 地图材质颜色
// const COLOR_ARR = [0x3C6EAB, 0x2F75AC, '#0465BD', '#4350C1', '#008495']
// const COLOR_ARR = [0x3C6EAB, 0x2F75AC, '#0465BD', '#357bcb', '#408db3']
const COLOR_ARR = ['#0465BD', '#357bcb', '#3a7abd']
const HIGHT_COLOR = '#ffff00'

let csmHelper;
const params = {
    orthographic: false,
    fade: false,
    far: 1000,
    mode: 'practical',
    // mode: 'uniform',
    lightX: - 1,
    lightY: - 1,
    lightZ: - 1,
    margin: 100,
    lightFar: 5000,
    lightNear: 1,
    autoUpdateHelper: true,
    updateHelper: function () {
        csmHelper.update();
    }
};

export default class lineMap {
    constructor(container, el, options) {
        this.container = container ? container : document.body;
        this.width = this.container.offsetWidth
        this.height = this.container.offsetHeight
        this.provinceInfo = el
        const {
            tagClick = () => { }
        } = options
        this.tagClick = tagClick
    }

    init() {
        this.provinceInfo = this.provinceInfo || document.getElementById('provinceInfo');
        this.group = new THREE.Object3D(); // 标注

        this.selectedObject = null
        // 渲染器
        // this.renderer = new THREE.WebGLRenderer();
        if (!this.renderer) {
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        }
        this.renderer.shadowMap.enabled = true; // 开启阴影
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;

        this.renderer.setPixelRatio(window.devicePixelRatio);
        // 清除背景色，透明背景
        this.renderer.setClearColor(0xffffff, 0);

        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);


        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = null


        // probe
        this.lightProbe = new THREE.LightProbe();

        // this.scene.add(bulbLight)
        this.scene.add(this.lightProbe);

        // 相机 透视相机
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 5000);
        this.camera.position.set(0, -40, 70);
        this.camera.lookAt(0, 0, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        this.csm = new CSM({
            maxFar: params.far,
            cascades: 4,
            mode: params.mode,
            parent: this.scene,
            shadowMapSize: 1024,
            lightDirection: new THREE.Vector3(params.lightX, params.lightY, params.lightZ).normalize(),
            camera: this.camera
        });

        this.csmHelper = new CSMHelper(this.csm);
        this.csmHelper.visible = false;
        this.scene.add(this.csmHelper);


        this.setController(); // 设置控制
        this.setLight(); // 设置灯光
        this.animate();


        this.loadMapData();
    }


    loadMapData() {
        let _this = this;

        let jsonData = require('./json/china.json')

        _this.initMap(jsonData);
    }


    createText(text, position) {
        var shapes = this.font.generateShapes(text, 1);

        var geometry = new THREE.ShapeBufferGeometry(shapes);

        var material = new THREE.MeshBasicMaterial();

        var textMesh = new THREE.Mesh(geometry, material);
        textMesh.position.set(position.x, position.y, position.z);

        this.scene.add(textMesh);
    }

    initMap(chinaJson) {
        // 建一个空对象存放对象
        this.map = new THREE.Object3D();

        let _this = this;


        chinaJson.features.forEach((elem, index) => {
            // 定一个省份3D对象
            const province = new THREE.Object3D();
            // 每个的 坐标 数组
            const coordinates = elem.geometry.coordinates;
            const color = COLOR_ARR[index % COLOR_ARR.length]
            // 循环坐标数组
            coordinates.forEach(multiPolygon => {

                multiPolygon.forEach((polygon) => {
                    const shape = new THREE.Shape();

                    for (let i = 0; i < polygon.length; i++) {
                        let [x, y] = projection(polygon[i]);

                        if (i === 0) {
                            shape.moveTo(x, -y);
                        }
                        shape.lineTo(x, -y);
                    }

                    const extrudeSettings = {
                        depth: 4,
                        bevelEnabled: true,
                        bevelSegments: 1,
                        bevelThickness: 0.2
                    };

                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);


                    const material = new THREE.MeshStandardMaterial({
                        clearcoat: 3.0,
                        metalness: 1,
                        color: color,

                    });

                    const material1 = new THREE.MeshStandardMaterial({
                        clearcoat: 3.0,
                        metalness: 1,
                        roughness: 1,
                        color: color,

                    });

                    const mesh = new THREE.Mesh(geometry, [
                        material,
                        material1
                    ]);
                    if (index % 2 === 0) {
                        mesh.scale.set(1, 1, 1.2);
                    }

                    mesh.castShadow = true
                    mesh.receiveShadow = true
                    mesh._color = color
                    province.add(mesh);

                })

            })

            // 将geo的属性放到省份模型中
            province.properties = elem.properties;
            if (elem.properties.centorid) {
                const [x, y] = projection(elem.properties.centorid);
                province.properties._centroid = [x, y];
            }

            _this.map.add(province);

        })

        // _this.scene.environment = cubeTexture;
        // 销毁贴图
        // cubeTexture.dispose();
        _this.scene.add(_this.map);


    }




    setLight() {
        let ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // 环境光

        const light = new THREE.DirectionalLight(0xffffff, 0.5); // 平行光
        light.position.set(20, -50, 20);

        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;


        // 半球光
        let hemiLight = new THREE.HemisphereLight('#80edff', '#75baff', 0.3)
        // 这个也是默认位置
        hemiLight.position.set(20, -50, 0)
        this.scene.add(hemiLight)

        const pointLight = new THREE.PointLight(0xffffff, 0.5)
        pointLight.position.set(20, -50, 50);

        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 1024;
        pointLight.shadow.mapSize.height = 1024;


        const pointLight2 = new THREE.PointLight(0xffffff, 0.5)
        pointLight2.position.set(50, -50, 20);
        pointLight2.castShadow = true;
        pointLight2.shadow.mapSize.width = 1024;
        pointLight2.shadow.mapSize.height = 1024;

        const pointLight3 = new THREE.PointLight(0xffffff, 0.5)
        pointLight3.position.set(-50, -50, 20);
        pointLight3.castShadow = true;
        pointLight3.shadow.mapSize.width = 1024;
        pointLight3.shadow.mapSize.height = 1024;

        this.scene.add(ambientLight);
        this.scene.add(light);
        this.scene.add(pointLight);
        this.scene.add(pointLight2);
        this.scene.add(pointLight3);

    }

    setController() {
        this.controller = new OrbitControls(this.camera, this.renderer.domElement);
        this.controller.update();
        /* this.controller.enablePan = false; // 禁止右键拖拽

        this.controller.enableZoom = true; // false-禁止右键缩放
        
        this.controller.maxDistance = 200; // 最大缩放 适用于 PerspectiveCamera
        this.controller.minDistance = 50; // 最大缩放

        this.controller.enableRotate = true; // false-禁止旋转 */

        /* this.controller.minZoom = 0.5; // 最小缩放 适用于OrthographicCamera
        this.controller.maxZoom = 2; // 最大缩放 */

    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        // if (this.raycaster) {
        //     this.raycaster.setFromCamera(this.mouse, this.camera);

        //     // calculate objects intersecting the picking ray
        //     var intersects = this.raycaster.intersectObjects(this.scene.children, true);
        //     if (this.activeInstersect && this.activeInstersect.length > 0) { // 将上一次选中的恢复颜色
        //         this.activeInstersect.forEach(element => {
        //             const { object } = element
        //             const { _color, material } = object
        //             material[0].color.set(_color);
        //             material[1].color.set(_color);
        //         });
        //     }

        //     this.activeInstersect = []; // 设置为空
        //     // console.log('select', intersects)
        //     for (var i = 0; i < intersects.length; i++) {
        //         // debugger;
        //         if (intersects[i].object.material && intersects[i].object.material.length === 2) {
        //             this.activeInstersect.push(intersects[i]);
        //             intersects[i].object.material[0].color.set(HIGHT_COLOR);
        //             intersects[i].object.material[1].color.set(HIGHT_COLOR);
        //             break; // 只取第一个
        //         }
        //     }
        // }

        this.camera.updateMatrixWorld();
        // this.csm.update();
        // this.controller.update();
        // csmHelper.update();
        if (!this.renderer) {
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        }
        this.renderer.render(this.scene, this.camera);
        // TWEEN.update()
    }


    // 丢失 context
    destroyed() {
        if (this.renderer) {
            this.renderer.forceContextLoss()
            this.renderer.dispose()
            this.renderer.domElement = null
            this.renderer = null
        }
        window.removeEventListener('resize', this.resizeEventHandle)
    }
}