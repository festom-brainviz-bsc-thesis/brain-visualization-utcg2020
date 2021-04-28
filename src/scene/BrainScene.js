import React, {Component, createRef} from "react";
import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {Grid, GridColumn, Sticky, Ref} from "semantic-ui-react";
import {hiddenIndexes} from "../helpers/Utility";
import {PageSidebar} from "./PageSidebar";
import {PageHeader} from "./PageHeader";
import {Group, Mesh} from "three";
import UploadBox from "./UploadBox";

const clamp = (val, from, to) => Math.min(Math.max(val, from), to);

const sceneStyle = {
  height: 750, // we can control scene size by setting container dimensions
};
const totalTime = 10000; // 10s

const sprite = new THREE.TextureLoader().load( "sprites/disc.png" );
const vertexShader = `
#define PI 3.1415926535

attribute vec3 color;
attribute float hidden;
attribute float nodeValue;
attribute float nextNodeValue;

uniform float maxPointSize;
uniform float timeToNext;

varying vec3 fragColor;
varying float fragHidden;

vec3 getColor(float nv) {
  if(nv <= 0.0) {
    return vec3(0.0, 0.0, abs(nv)); 
  } else { 
    return vec3(abs(nv), 0.0, 0.0);
  }
}

void main() {
  fragColor = mix(getColor(clamp(nodeValue, -1.0, 1.0)), getColor(clamp(nextNodeValue, -1.0, 1.0)), timeToNext);
  fragHidden = hidden;

  gl_PointSize = maxPointSize * pow(abs(mix(nodeValue, nextNodeValue, timeToNext)), 1.5);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const fragmentShader = `
uniform sampler2D tex;

varying float fragHidden;
varying vec3 fragColor;

void main() {

  if(fragHidden > 0.9) discard;
  float texOpacity = texture2D(tex, gl_PointCoord.st).a;
  if(texOpacity < 0.5) discard;
 
  gl_FragColor = vec4(fragColor.rgb, texOpacity);
}
`;

class BrainScene extends Component {
  contextRef = createRef();

  state = {
    mniCoords: [],
  }

  async componentDidMount() {
    document.title = "Human Brain Activity";
    this.setState({
      displaySettings: {
        category: 0,
        onlyPredictiveProbes: false,
        colorCoded: false,
        highGammaFrq: false,
        moment: 0,
        maxMoment: 0,
        msPerMoment: 200,
      },
      categoryLabels: [],
      categoryCount: 0,
      playing: false,
      brainOpacity: 0.4,
      initialized: false,
      clock: new THREE.Clock(),
      material: new THREE.ShaderMaterial({
        uniforms: {
          tex: {
            type: "t",
            value: sprite,
          },
          maxPointSize: {
            type: "f",
            value: 25.0,
          },
          timeToNext: {
            type: "f",
            value: 0.0,
          },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    });
    this.loadModel = this.loadModel.bind(this);
    this.sceneSetup();
    await this.addCustomSceneObjects();
    this.startAnimationLoop();
    window.addEventListener("resize", this.handleWindowResize);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (JSON.stringify(prevState.displaySettings) !== JSON.stringify(this.state.displaySettings)) {
      this.updatePoints();
    }
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleWindowResize);
    window.cancelAnimationFrame(this.requestID);
    this.controls.dispose();
  }

  // Standard scene setup in Three.js. Check "Creating a scene" manual for more information
  // https://threejs.org/docs/#manual/en/introduction/Creating-a-scene
  sceneSetup() {
    // get container dimensions and use them for scene sizing
    const width = this.el.clientWidth;
    const height = this.el.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
        75, // fov = field of view
        width / height, // aspect ratio
        0.1, // near plane
        1000, // far plane
    );
    this.camera.position.z = 200; // is used here to set some distance from a cube that is located at z = 0
    // OrbitControls allow a camera to orbit around the object
    // https://threejs.org/docs/#examples/controls/OrbitControls
    this.controls = new OrbitControls(this.camera, this.el);
    this.renderer = new THREE.WebGLRenderer({alpha: true});
    this.renderer.setClearColor( 0xffffff, 0);
    this.renderer.setSize(width, height);
    this.el.appendChild(this.renderer.domElement); // mount using React ref
  };

  // Here should come custom code.
  // Code below is taken from Three.js BoxGeometry example
  // https://threejs.org/docs/#api/en/geometries/BoxGeometry
  async addCustomSceneObjects() {
    const scene = this.scene;

    // load brain models
    const loader = new GLTFLoader();
    loader.setPath("/models/");

    const brainScene = await this.loadModel(loader, scene, "brainsceneAltY.glb");

    const children = brainScene.scene.children.filter((c) => c instanceof Mesh);
    const brainGroup = new Group();

    // dawnbringer 32 pallette from https://lospec.com/palette-list/dawnbringer-32
    const pallette = [
      0x000000,
      0x222034,
      0x45283c,
      0x663931,
      0x8f563b,
      0xdf7126,
      0xd9a066,
      0xeec39a,
      0xfbf236,
      0x99e550,
      0x6abe30,
      0x37946e,
      0x4b692f,
      0x524b24,
      0x323c39,
      0x3f3f74,
      0x306082,
      0x5b6ee1,
      0x639bff,
      0x5fcde4,
      0xcbdbfc,
      0xffffff,
      0x9badb7,
      0x847e87,
      0x696a6a,
      0x595652,
      0x76428a,
      0xac3232,
      0xd95763,
      0xd77bba,
      0x8f974a,
      0x8a6f30,
    ];
    // sort brain parts by names
    children.sort((a, b) => (a.name > b.name) ? 1 : -1);
    // set children's material
    children.forEach((child, idx) => {
      // Assign same colours to both hemispheres
      const color = pallette[idx % 32];
      const material = new THREE.MeshLambertMaterial({color} );
      material.opacity = this.state.brainOpacity;
      material.transparent = true;
      child.material = material;
      brainGroup.add(child);
    });
    const brainGyriNames = children.map((c) => c.name);

    brainGroup.renderOrder = 1;
    // positioning
    brainGroup.position.set(0, 15, 0);
    brainGroup.scale.set(1.2, 1.1, 1);
    brainGroup.rotation.set(Math.PI, Math.PI, 0);

    scene.add(brainGroup);
    this.setState({mesh: brainGroup, brainGyriNames});
    const lights = [];
    lights[0] = new THREE.PointLight(0xffffff, 1, 0);
    lights[1] = new THREE.PointLight(0xffffff, 1, 0);
    lights[2] = new THREE.PointLight(0xffffff, 1, 0);

    lights[0].position.set(0, 200, 0);
    lights[1].position.set(100, 200, 100);
    lights[2].position.set(-100, -200, -100);

    this.scene.add(lights[0]);
    this.scene.add(lights[1]);
    this.scene.add(lights[2]);
  };

  startAnimationLoop = () => {
    const delta = this.state.clock && this.state.clock.getDelta();
    // const elapsed = this.state.clock && this.state.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
    // The window.requestAnimationFrame() method tells the browser that you wish to perform
    // an animation and requests that the browser call a specified function
    // to update an animation before the next repaint
    if (!this.state.clock.running && this.state.playing) {
      this.state.clock.start();
    }
    if (this.state.clock.running && !this.state.playing) {
      this.state.clock.stop();
    }
    if (this.state.displaySettings.moment >= this.state.displaySettings.maxMoment && this.state.clock.running) {
      // this.state.clock.stop();
      // this.setState({playing: false});
      this.hooks.togglePlayPause();
    } else if (this.state.clock.running && this.state.playing) {
      this.updateMoment(this.state.displaySettings.moment + 1000*delta/this.state.displaySettings.msPerMoment);
    }
    this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
  };

  handleWindowResize = () => {
    const width = this.el.clientWidth;
    const height = this.el.clientHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;

    // Note that after making changes to most of camera properties you have to call
    // .updateProjectionMatrix for the changes to take effect.
    this.camera.updateProjectionMatrix();
  };

  updatePoints() {
    if (this.state.initialized) {
      const mniCoords = this.state.mniCoords;
      const neuralData = this.state.neuralData;

      const pointCount = mniCoords.length;
      const nodeValue = this.state.dots.geometry.attributes.nodeValue;
      const nextNodeValue = this.state.dots.geometry.attributes.nextNodeValue;
      const hidden = this.state.dots.geometry.attributes.hidden;

      const {
        category,
        moment,
      } = this.state.displaySettings;

      const timeToNextUniform = this.state.material.uniforms.timeToNext;

      // categories && various datas
      let curMoment;
      let nextMoment;
      let timeToNext;

      if (moment % 1 === 0) {
        curMoment = moment;
        timeToNext = 0.0;
      } else {
        curMoment = Math.floor(moment);
        timeToNext = moment - curMoment;
      }

      timeToNextUniform.value = timeToNext;
      timeToNextUniform.needsUpdate = true;

      nextMoment = curMoment + 1;
      if (curMoment === this.state.displaySettings.maxMoment) {
        nextMoment = curMoment;
      }

      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        // filter out probes with hidden indexes
        if (hiddenIndexes.includes(pointIndex)) {
          hidden.array[pointIndex] = 1;
        } else {
          hidden.array[pointIndex] = 0;
        }

        const value = neuralData[category][pointIndex][curMoment]/100;
        const nextValue = neuralData[category][pointIndex][nextMoment]/100;

        nodeValue.array[pointIndex] = value;
        nextNodeValue.array[pointIndex] = nextValue;
      }

      hidden.needsUpdate = true;
      nodeValue.needsUpdate = true;
      nextNodeValue.needsUpdate = true;
    }
  }

  initPoints() {
    if (this.scene && this.state.mniCoords && this.state.neuralData) {
      const pointCount = this.state.mniCoords.length;
      const mniData = this.state.mniCoords;

      const {
        category,
        moment,
      } = this.state.displaySettings;

      const geometry = new THREE.BufferGeometry();
      const position = new Float32Array(pointCount * 3);
      const nodeValue = new Float32Array(pointCount);
      const nextNodeValue = new Float32Array(pointCount);
      const hidden = new Array(pointCount);
      const color = new Float32Array(pointCount * 3);
      const dcnn = new Int8Array(pointCount); // remove soon

      for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
        // if (!hiddenIndexes.includes(pointIndex)) {

        const [x, y, z] = [mniData[pointIndex][0], mniData[pointIndex][2], mniData[pointIndex][1]];
        position[pointIndex*3] = x;
        position[pointIndex*3 + 1] = y;
        position[pointIndex*3 + 2] = z;
        nodeValue[pointIndex] = this.state.neuralData[category][pointIndex][moment]/100;
        nextNodeValue[pointIndex] = this.state.neuralData[category][pointIndex][moment + 1]/100;
        hidden[pointIndex] = 0;
        dcnn[pointIndex] = -1;
      }

      geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(color, 3));
      geometry.setAttribute("hidden", new THREE.Float32BufferAttribute(hidden, 1));
      geometry.setAttribute("nodeValue", new THREE.Float32BufferAttribute(nodeValue, 1));
      geometry.setAttribute("nextNodeValue", new THREE.Float32BufferAttribute(nextNodeValue, 1));
      geometry.setAttribute("dcnn", new THREE.Int32BufferAttribute(dcnn, 1));

      const points = new THREE.Points( geometry, this.state.material );
      this.scene.add( points );
      this.setState({dots: points, initialized: true});
    }
  }


  hooks = {
    toggleCategory: (value) => {
      this.setState((prevState) =>
        ({displaySettings: {
          ...prevState.displaySettings,
          category: value,
        }}));
    },
    timeForward: () => {
      if (this.state.displaySettings.moment !== this.state.displaySettings.maxMoment) {
        this.updateMoment(this.state.displaySettings.moment + 1);
      }
      if (this.state.displaySettings.moment === this.state.displaySettings.maxMoment) {
        this.setState({playing: false});
      }
    },
    timeBackward: () => {
      if (this.state.displaySettings.moment !== 0) {
        this.updateMoment(this.state.displaySettings.moment - 1);
      }
    },
    updateBrainOpacity: (brainOpacity) => {
      this.setState({brainOpacity});
      if (this.state.mesh) {
        this.state.mesh.children.forEach((child) => {
          if (child.material) {
            child.material.opacity = brainOpacity;
          }
        });
      }
    },
    togglePlayPause: () => {
      if (this.state.clock.running) {
        this.state.clock.stop();
      } else {
        this.state.clock.start();
      }
      this.setState({playing: !this.state.playing});
    },
    resetTime: () => {
      this.setState({playing: false});
      this.updateMoment(0);
    },
    selectGyri: (_, e) => {
      const gyri = e.value;
      if (this.state.mesh) {
        this.state.mesh.children.forEach((child) => {
          if (gyri.length === 0 || gyri.includes(child.name)) {
            child.visible = true;
          } else {
            child.visible = false;
          }
        });
      }
    },
  }

  updateMoment = (moment) => {
    const newMoment = clamp(moment, 0, this.state.displaySettings.maxMoment);
    this.setState({displaySettings: {...this.state.displaySettings, moment: newMoment}});
  }

  onNpyFileRead = (target, data) => {
    switch (target) {
      case "neuralData":
        this.setState({
          "neuralData": data,
          "categoryCount": data.length,
          "displaySettings": {
            ...this.state.displaySettings,
            maxMoment: data[0][0].length - 1,
            msPerMoment: totalTime / (data[0][0].length - 1),
          },
        });
        break;
      case "MNIcoordinates":
        this.setState({
          "mniCoords": data,
        });
        break;
      case "categoryLabels":
        this.setState({
          "categoryLabels": data,
        });
        break;
      default:
        return;
    }
    this.initPoints();
  }

  render() {
    return <Ref innerRef={this.contextRef}>
      <Grid columns={2}>
        <GridColumn width={4} style={{
          paddingLeft: "2rem",
          marginTop: "5rem",
        }}>
          <UploadBox
            target={"neuralData"}
            label={"Upload neural data"}
            description={"A 3D .npy matrix with dimensions corresponding to CATEGORIES x PROBES x TIME. CATEGORIES " +
            "must at least be of length 1."}
            onNpyFileRead={this.onNpyFileRead}
          />
          <UploadBox
            target={"MNIcoordinates"}
            label={"Upload MNI coordinates"}
            description={"A 2D .npy matrix with dimensions corresponding to PROBES x 3 for each spatial dimension. " +
            "Y is the vertical dimension and the ordering of dimensions should be [x, z, y]."}
            onNpyFileRead={this.onNpyFileRead}
          />
          <UploadBox
            target={"categoryLabels"}
            label={"Upload stimulus image category labels (optional)"}
            description={"A .npy vector of strings or ints of length CATEGORIES."}
            onNpyFileRead={this.onNpyFileRead}
          />
          <PageSidebar
            displaySettings={this.state.displaySettings}
            playing={this.state.playing}
            hooks={this.hooks}
            updateMoment={this.updateMoment}
            slider={this.slider}
            brainOpacity={this.state.brainOpacity}
            brainGyriNames={this.state.brainGyriNames}
            categoryLabels={this.state.categoryLabels}
            categoryCount={this.state.categoryCount}
          />
        </GridColumn>
        <GridColumn width={12}>
          <Sticky context={this.contextRef}>
            <PageHeader/>
            <div style={sceneStyle} ref={(ref) => (this.el = ref)}/>
          </Sticky>
        </GridColumn>
      </Grid>
    </Ref>;
  }

  loadModel(loader, scene, model) {
    return new Promise(((resolve, reject) => {
      loader.load(model, (gltf) => resolve(gltf), null, reject);
    }));
  }
}

export {BrainScene};
