var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TEXTURE_SRC_BEFORE = 'js/photo-1457369900526-e7606baa133b.jpg'; // https://unsplash.com/photos/dcp4hnQY-z0
var TEXTURE_SRC_AFTER = 'js/photo-1456947700819-d91abdf38117.jpg'; // https://unsplash.com/photos/weuWmzv7xnU

var PREFAB = {
  WIDTH: 1,
  HEIGHT: 1
};

var START_DELAY = 500;
var INTERVAL = '10.';
var DURATION_START = '1.2';
var DURATION_END = '1.2';

function init(textureBefore, textureAfter) {
  var image = textureBefore.image;
  var width = image.width;
  var height = image.height;
  var intervalX = width / PREFAB.WIDTH;
  var intervalY = height / PREFAB.HEIGHT;

  var root = new THREERoot({
    cameraPosition: [0, 0, width * 2.5],
    aspect: 0.6 / 1,
    autoStart: false
  });

  var prefab = new THREE.PlaneGeometry(PREFAB.WIDTH, PREFAB.HEIGHT);
  var geometry = new BAS.PrefabBufferGeometry(prefab, intervalX * intervalY);
  var aPosition = geometry.createAttribute('aPosition', 4);

  var i = 0;
  for (var x = 0; x < intervalX; x++) {
    for (var y = 0; y < intervalY; y++) {
      geometry.setPrefabData(aPosition, i++, [x * PREFAB.WIDTH - width / 2, y * PREFAB.HEIGHT - height / 2, 0, Math.random() // random coefficient
      ]);
    }
  }

  textureBefore.minFilter = THREE.LinearFilter;
  textureAfter.minFilter = THREE.LinearFilter;

  var material = new BAS.BasicAnimationMaterial({
    side: THREE.DoubleSide,
    vertexColors: THREE.VertexColors,
    uniforms: {
      uTime: { type: 'f', value: 0 },
      uSize: { type: 'vf2', value: [width, height] },
      mapBefore: { type: 't', value: textureBefore },
      mapAfter: { type: 't', value: textureAfter }
    },
    vertexFunctions: [BAS.ShaderChunk['ease_quad_in_out'], BAS.ShaderChunk['ease_quad_in'], BAS.ShaderChunk['ease_quad_out']],
    vertexParameters: '\n      uniform float uTime;\n      uniform vec2 uSize;\n      uniform sampler2D mapBefore;\n      uniform sampler2D mapAfter;\n      attribute vec4 aPosition;\n      const float interval = ' + INTERVAL + ';\n      const float durationStart = ' + DURATION_START + ';\n      const float durationEnd = ' + DURATION_END + ';\n      const float totalTime = durationStart + interval + durationEnd;\n      const float speed = 60.;\n      const float minWeight = 0.3;\n      const float fallSpeed = 4.;\n      const float xSpeed = 0.03;\n      const float spreadPosition = 0.03;\n    ',
    vertexInit: '\n      vec2 texelCoord = (aPosition.xy + uSize / 2.) / uSize;\n      vec4 texelBefore = texture2D(mapBefore, texelCoord);\n      vec4 texelAfter = texture2D(mapAfter, texelCoord);\n      float bottom = aPosition.y - uSize.y * 1.8;\n      float time = uTime / 50.;\n      float tTime = mod(time, totalTime);\n      float doubleTime = mod(time, totalTime * 2.);\n      float isReverse = step(totalTime, doubleTime);\n      float progress = max(tTime - durationStart, 0.);\n      float nProgress = progress / interval;\n      float move = progress * speed;\n      float weightBefore = pow(1. - texelBefore.r * texelBefore.g * texelBefore.b, 2.) * (1. - minWeight) + minWeight;\n      float weightAfter = pow(1. - texelAfter.r * texelAfter.g * texelAfter.b, 2.) * (1. - minWeight) + minWeight;\n      float order = pow(abs(aPosition.x) / (uSize.x * 0.5), 2.) * 40.;\n      float fall = max(-aPosition.y - uSize.y / 2. + move - order, 0.) * (aPosition.w * 0.2 + 1.) * (0.3 + nProgress) * fallSpeed;\n      float y = aPosition.y - fall * mix(weightBefore, weightAfter, easeQuadIn(min(fall, -bottom) / -bottom)) - move + order * clamp(progress, 0., 1.);\n      float offsetY = easeQuadOut(clamp(tTime / durationStart, 0., 1.)) * uSize.y * 0.9;\n      float endOffsetY = easeQuadIn(clamp((tTime - (durationStart + interval)) / durationEnd, 0., 1.)) * uSize.y * 0.9;\n    ',
    vertexPosition: '\n      transformed.x += aPosition.x / (1. + fall * xSpeed * max(1. - max(-y + (bottom * (1. - spreadPosition)), 0.) / (-bottom * spreadPosition), 0.));\n      transformed.y += max(y, bottom) + offsetY + endOffsetY;\n      transformed.z += aPosition.z;\n    ',
    vertexColor: '\n      vec4 colorBefore = texelBefore * (1. - isReverse) + texelAfter * isReverse;\n      vec4 colorAfter = texelBefore * isReverse + texelAfter * (1. - isReverse);\n      vColor = mix(colorBefore.rgb, colorAfter.rgb, smoothstep(-uSize.y / 2., bottom, y));\n    '
  });
  material.uniforms['mapBefore'].value.needsUpdate = true;
  material.uniforms['mapAfter'].value.needsUpdate = true;

  var mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  root.add(mesh);

  var time = -50;

  var postShader = new THREE.ShaderPass({
    uniforms: {
      'tDiffuse': { type: 't', value: null },
      'uTime': { type: 'f', value: time }
    },
    vertexShader: '\n      varying vec2 vUv;\n\n      void main () {\n        vUv = uv;\n        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);\n      }\n    ',
    fragmentShader: '\n      uniform sampler2D tDiffuse;\n      uniform float uTime;\n      varying vec2 vUv;\n      const float interval = ' + INTERVAL + ';\n      const float durationStart = ' + DURATION_START + ';\n      const float durationEnd = ' + DURATION_END + ';\n      const float totalTime = durationStart + interval + durationEnd;\n      const float size = 0.03;\n      const float halfSize = size * 0.5;\n      const float n = size * 4.;\n      const float brightness = 500.;\n      const float speed = 0.006;\n\n      vec4 getMosaicColor (vec2 coord) {\n        return texture2D(tDiffuse, coord);\n        // vec4 mosaicColor = vec4(0.);\n        // for (float x = 0.; x <= size; x += size * 0.2) {\n        //   for (float y = 0.; y <= size; y += size * 0.2) {\n        //     mosaicColor += texture2D(tDiffuse, vec2(coord.x + x, coord.y + y));\n        //   }\n        // }\n        // return mosaicColor;\n      }\n      float lengthN (vec2 v, float n) {\n        vec2 tmp = pow(abs(v), vec2(n));\n        return pow(tmp.x + tmp.y, size / n);\n      }\n      float random (vec2 st) {\n        return fract(sin(dot(st, vec2(12.9898, 4.1414))) * 43758.5453);\n      }\n\n      void main () {\n        vec4 texel = texture2D(tDiffuse, vUv);\n        vec2 mosaicCoord = floor(vUv / size) * size + halfSize;\n        vec4 mosaicColor = getMosaicColor(mosaicCoord);\n        vec2 p = mod(vUv, size) - halfSize;\n        float time = uTime / 50.;\n        float tTime = mod(time, totalTime);\n        float doubleTime = mod(time, totalTime * 2.);\n        float isReverse = step(totalTime, doubleTime);\n        float mosaicBrightness = mosaicColor.r * mosaicColor.g * mosaicColor.b;\n        float isBright = step(0.0005, mosaicBrightness);\n        // float isBright = step(0.02, mosaicBrightness / 36.);\n        float isBlink = isBright * abs(min(step(vUv.y, 0.5) + step(0., tTime - (durationStart + interval)), 1.) * step(durationStart, tTime) - isReverse);\n        float l = (1. - clamp(lengthN(p, n), 0., 1.)) * isBlink;\n        float n = random(mosaicCoord) * 10.;\n        float blink = l * brightness * max(sin(uTime * speed + n) - 0.99, 0.);\n        gl_FragColor = texel + vec4(vec3(blink), 1.);\n      }\n    '
  });
  root.initPostProcessing([postShader, new THREE.BloomPass(1.3, 25, 3.1, 256), new THREE.ShaderPass(THREE.CopyShader)]);

  root.addUpdateCallback(function () {
    time++;
    material.uniforms['uTime'].value = time;
    postShader.uniforms['uTime'].value = time;
  });

  root.update(time);
  root.render();
  setTimeout(function () {
    root.start();
  }, START_DELAY);
}

var textureBefore = void 0,
    textureAfter = void 0;
function onLoad() {
  textureBefore && textureAfter && init(textureBefore, textureAfter);
}
new THREE.TextureLoader().load(TEXTURE_SRC_BEFORE, function (texture) {
  textureBefore = texture;
  onLoad();
});
new THREE.TextureLoader().load(TEXTURE_SRC_AFTER, function (texture) {
  textureAfter = texture;
  onLoad();
});

// --------------------
// Three.js Wrapper
// forked from https://github.com/zadvorsky/three.bas/blob/86931253240abadf68b7c62edb934b994693ed4a/examples/_js/root.js
// --------------------

var THREERoot = function () {
  function THREERoot(params) {
    var _camera$position,
        _this = this;

    _classCallCheck(this, THREERoot);

    // defaults
    params = Object.assign({
      container: document.body,
      fov: 45,
      zNear: 1,
      zFar: 10000,
      cameraPosition: [0, 0, 30],
      createCameraControls: false,
      autoStart: true,
      pixelRatio: window.devicePixelRatio,
      antialias: window.devicePixelRatio === 1,
      alpha: false,
      clearColor: 0x000000
    }, params);

    // maps and arrays
    this.updateCallbacks = [];
    this.resizeCallbacks = [];
    this.objects = {};

    // renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: params.antialias,
      alpha: params.alpha
    });
    this.renderer.setPixelRatio(params.pixelRatio);
    this.renderer.setClearColor(params.clearColor);
    this.canvas = this.renderer.domElement;

    // container
    this.container = typeof params.container === 'string' ? document.querySelector(params.container) : params.container;
    this.container.appendChild(this.canvas);

    this.aspect = params.aspect;
    this.setSize();

    // camera
    this.camera = new THREE.PerspectiveCamera(params.fov, this.width / this.height, params.zNear, params.zFar);
    (_camera$position = this.camera.position).set.apply(_camera$position, _toConsumableArray(params.cameraPosition));

    // scene
    this.scene = new THREE.Scene();

    // resize handling
    this.resize();
    window.addEventListener('resize', function () {
      _this.resize();
    });

    // tick / update / render
    params.autoStart && this.tick();

    // optional camera controls
    params.createCameraControls && this.createOrbitControls();

    // pointer
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
  }

  _createClass(THREERoot, [{
    key: 'setSize',
    value: function setSize() {
      if (this.aspect) {
        if (this.container.clientWidth / this.container.clientHeight > this.aspect) {
          this.width = this.container.clientHeight * this.aspect;
          this.height = this.container.clientHeight;
        } else {
          this.width = this.container.clientWidth;
          this.height = this.container.clientWidth / this.aspect;
        }
      } else {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
      }
    }
  }, {
    key: 'createOrbitControls',
    value: function createOrbitControls() {
      var _this2 = this;

      if (!THREE.TrackballControls) {
        console.error('TrackballControls.js file is not loaded.');
        return;
      }

      this.controls = new THREE.TrackballControls(this.camera, this.canvas);
      this.addUpdateCallback(function () {
        _this2.controls.update();
      });
    }
  }, {
    key: 'start',
    value: function start() {
      this.tick();
    }
  }, {
    key: 'stop',
    value: function stop() {
      cancelAnimationFrame(this.animationFrameId);
    }
  }, {
    key: 'addUpdateCallback',
    value: function addUpdateCallback(callback) {
      this.updateCallbacks.push(callback);
    }
  }, {
    key: 'addResizeCallback',
    value: function addResizeCallback(callback) {
      this.resizeCallbacks.push(callback);
    }
  }, {
    key: 'add',
    value: function add(object, key) {
      key && (this.objects[key] = object);
      this.scene.add(object);
    }
  }, {
    key: 'addTo',
    value: function addTo(object, parentKey, key) {
      key && (this.objects[key] = object);
      this.get(parentKey).add(object);
    }
  }, {
    key: 'get',
    value: function get(key) {
      return this.objects[key];
    }
  }, {
    key: 'remove',
    value: function remove(o) {
      var object = void 0;

      if (typeof o === 'string') {
        object = this.objects[o];
      } else {
        object = o;
      }

      if (object) {
        object.parent.remove(object);
        delete this.objects[o];
      }
    }
  }, {
    key: 'tick',
    value: function tick(time) {
      var _this3 = this;

      this.update(time);
      this.render();
      this.animationFrameId = requestAnimationFrame(function (time) {
        _this3.tick(time);
      });
    }
  }, {
    key: 'update',
    value: function update(time) {
      this.updateCallbacks.forEach(function (callback) {
        callback(time);
      });
    }
  }, {
    key: 'render',
    value: function render() {
      this.renderer.render(this.scene, this.camera);
    }
  }, {
    key: 'resize',
    value: function resize() {
      this.container.style.width = '';
      this.container.style.height = '';
      this.setSize();

      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.width, this.height);
      this.resizeCallbacks.forEach(function (callback) {
        callback();
      });
    }
  }, {
    key: 'initPostProcessing',
    value: function initPostProcessing(passes) {
      var _this4 = this;

      var size = this.renderer.getSize();
      var pixelRatio = this.renderer.getPixelRatio();
      size.width *= pixelRatio;
      size.height *= pixelRatio;

      var composer = this.composer = new THREE.EffectComposer(this.renderer, new THREE.WebGLRenderTarget(size.width, size.height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        stencilBuffer: false
      }));

      var renderPass = new THREE.RenderPass(this.scene, this.camera);
      composer.addPass(renderPass);

      for (var i = 0; i < passes.length; i++) {
        var pass = passes[i];
        pass.renderToScreen = i === passes.length - 1;
        composer.addPass(pass);
      }

      this.renderer.autoClear = false;
      this.render = function () {
        _this4.renderer.clear();
        composer.render();
      };

      this.addResizeCallback(function () {
        composer.setSize(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio);
      });
    }
  }, {
    key: 'checkPointer',
    value: function checkPointer(_ref, meshs, handler, nohandler) {
      var x = _ref.x,
          y = _ref.y;

      this.pointer.x = x / this.canvas.clientWidth * 2 - 1;
      this.pointer.y = -(y / this.canvas.clientHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      var intersects = this.raycaster.intersectObjects(meshs);

      if (intersects.length > 0) {
        handler(intersects[0].object);

        return true;
      } else {
        nohandler && nohandler();

        return false;
      }
    }
  }]);

  return THREERoot;
}();

// --------------------
// for Post Processing
// copied from https://github.com/mrdoob/three.js/tree/dev/examples/js/postprocessing
// --------------------

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.EffectComposer = function (renderer, renderTarget) {

  this.renderer = renderer;

  if (renderTarget === undefined) {

    var parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false
    };
    var size = renderer.getSize();
    renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, parameters);
  }

  this.renderTarget1 = renderTarget;
  this.renderTarget2 = renderTarget.clone();

  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;

  this.passes = [];

  if (THREE.CopyShader === undefined) console.error("THREE.EffectComposer relies on THREE.CopyShader");

  this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
};

Object.assign(THREE.EffectComposer.prototype, {

  swapBuffers: function swapBuffers() {

    var tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;
  },

  addPass: function addPass(pass) {

    this.passes.push(pass);

    var size = this.renderer.getSize();
    pass.setSize(size.width, size.height);
  },

  insertPass: function insertPass(pass, index) {

    this.passes.splice(index, 0, pass);
  },

  render: function render(delta) {

    var maskActive = false;

    var pass,
        i,
        il = this.passes.length;

    for (i = 0; i < il; i++) {

      pass = this.passes[i];

      if (pass.enabled === false) continue;

      pass.render(this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive);

      if (pass.needsSwap) {

        if (maskActive) {

          var context = this.renderer.context;

          context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);

          this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, delta);

          context.stencilFunc(context.EQUAL, 1, 0xffffffff);
        }

        this.swapBuffers();
      }

      if (pass instanceof THREE.MaskPass) {

        maskActive = true;
      } else if (pass instanceof THREE.ClearMaskPass) {

        maskActive = false;
      }
    }
  },

  reset: function reset(renderTarget) {

    if (renderTarget === undefined) {

      var size = this.renderer.getSize();

      renderTarget = this.renderTarget1.clone();
      renderTarget.setSize(size.width, size.height);
    }

    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();

    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
  },

  setSize: function setSize(width, height) {

    this.renderTarget1.setSize(width, height);
    this.renderTarget2.setSize(width, height);

    for (var i = 0; i < this.passes.length; i++) {

      this.passes[i].setSize(width, height);
    }
  }

});

THREE.Pass = function () {

  // if set to true, the pass is processed by the composer
  this.enabled = true;

  // if set to true, the pass indicates to swap read and write buffer after rendering
  this.needsSwap = true;

  // if set to true, the pass clears its buffer before rendering
  this.clear = false;

  // if set to true, the result of the pass is rendered to screen
  this.renderToScreen = false;
};

Object.assign(THREE.Pass.prototype, {

  setSize: function setSize(width, height) {},

  render: function render(renderer, writeBuffer, readBuffer, delta, maskActive) {

    console.error("THREE.Pass: .render() must be implemented in derived pass.");
  }

});

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.ShaderPass = function (shader, textureID) {

  THREE.Pass.call(this);

  this.textureID = textureID !== undefined ? textureID : "tDiffuse";

  if (shader instanceof THREE.ShaderMaterial) {

    this.uniforms = shader.uniforms;

    this.material = shader;
  } else if (shader) {

    this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    this.material = new THREE.ShaderMaterial({

      defines: shader.defines || {},
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader

    });
  }

  this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.scene = new THREE.Scene();

  this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  this.scene.add(this.quad);
};

THREE.ShaderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

  constructor: THREE.ShaderPass,

  render: function render(renderer, writeBuffer, readBuffer, delta, maskActive) {

    if (this.uniforms[this.textureID]) {

      this.uniforms[this.textureID].value = readBuffer.texture;
    }

    this.quad.material = this.material;

    if (this.renderToScreen) {

      renderer.render(this.scene, this.camera);
    } else {

      renderer.render(this.scene, this.camera, writeBuffer, this.clear);
    }
  }

});

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.RenderPass = function (scene, camera, overrideMaterial, clearColor, clearAlpha) {

  THREE.Pass.call(this);

  this.scene = scene;
  this.camera = camera;

  this.overrideMaterial = overrideMaterial;

  this.clearColor = clearColor;
  this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 1;

  this.oldClearColor = new THREE.Color();
  this.oldClearAlpha = 1;

  this.clear = true;
  this.needsSwap = false;
};

THREE.RenderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

  constructor: THREE.RenderPass,

  render: function render(renderer, writeBuffer, readBuffer, delta, maskActive) {

    this.scene.overrideMaterial = this.overrideMaterial;

    if (this.clearColor) {

      this.oldClearColor.copy(renderer.getClearColor());
      this.oldClearAlpha = renderer.getClearAlpha();

      renderer.setClearColor(this.clearColor, this.clearAlpha);
    }

    renderer.render(this.scene, this.camera, readBuffer, this.clear);

    if (this.clearColor) {

      renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
    }

    this.scene.overrideMaterial = null;
  }

});

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.MaskPass = function (scene, camera) {

  THREE.Pass.call(this);

  this.scene = scene;
  this.camera = camera;

  this.clear = true;
  this.needsSwap = false;

  this.inverse = false;
};

THREE.MaskPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

  constructor: THREE.MaskPass,

  render: function render(renderer, writeBuffer, readBuffer, delta, maskActive) {

    var context = renderer.context;
    var state = renderer.state;

    // don't update color or depth

    state.buffers.color.setMask(false);
    state.buffers.depth.setMask(false);

    // lock buffers

    state.buffers.color.setLocked(true);
    state.buffers.depth.setLocked(true);

    // set up stencil

    var writeValue, clearValue;

    if (this.inverse) {

      writeValue = 0;
      clearValue = 1;
    } else {

      writeValue = 1;
      clearValue = 0;
    }

    state.buffers.stencil.setTest(true);
    state.buffers.stencil.setOp(context.REPLACE, context.REPLACE, context.REPLACE);
    state.buffers.stencil.setFunc(context.ALWAYS, writeValue, 0xffffffff);
    state.buffers.stencil.setClear(clearValue);

    // draw into the stencil buffer

    renderer.render(this.scene, this.camera, readBuffer, this.clear);
    renderer.render(this.scene, this.camera, writeBuffer, this.clear);

    // unlock color and depth buffer for subsequent rendering

    state.buffers.color.setLocked(false);
    state.buffers.depth.setLocked(false);

    // only render where stencil is set to 1

    state.buffers.stencil.setFunc(context.EQUAL, 1, 0xffffffff); // draw if == 1
    state.buffers.stencil.setOp(context.KEEP, context.KEEP, context.KEEP);
  }

});

THREE.ClearMaskPass = function () {

  THREE.Pass.call(this);

  this.needsSwap = false;
};

THREE.ClearMaskPass.prototype = Object.create(THREE.Pass.prototype);

Object.assign(THREE.ClearMaskPass.prototype, {

  render: function render(renderer, writeBuffer, readBuffer, delta, maskActive) {

    renderer.state.buffers.stencil.setTest(false);
  }

});

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.BloomPass = function (strength, kernelSize, sigma, resolution) {

  THREE.Pass.call(this);

  strength = strength !== undefined ? strength : 1;
  kernelSize = kernelSize !== undefined ? kernelSize : 25;
  sigma = sigma !== undefined ? sigma : 4.0;
  resolution = resolution !== undefined ? resolution : 256;

  // render targets

  var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };

  this.renderTargetX = new THREE.WebGLRenderTarget(resolution, resolution, pars);
  this.renderTargetY = new THREE.WebGLRenderTarget(resolution, resolution, pars);

  // copy material

  if (THREE.CopyShader === undefined) console.error("THREE.BloomPass relies on THREE.CopyShader");

  var copyShader = THREE.CopyShader;

  this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);

  this.copyUniforms["opacity"].value = strength;

  this.materialCopy = new THREE.ShaderMaterial({

    uniforms: this.copyUniforms,
    vertexShader: copyShader.vertexShader,
    fragmentShader: copyShader.fragmentShader,
    blending: THREE.AdditiveBlending,
    transparent: true

  });

  // convolution material

  if (THREE.ConvolutionShader === undefined) console.error("THREE.BloomPass relies on THREE.ConvolutionShader");

  var convolutionShader = THREE.ConvolutionShader;

  this.convolutionUniforms = THREE.UniformsUtils.clone(convolutionShader.uniforms);

  this.convolutionUniforms["uImageIncrement"].value = THREE.BloomPass.blurX;
  this.convolutionUniforms["cKernel"].value = THREE.ConvolutionShader.buildKernel(sigma);

  this.materialConvolution = new THREE.ShaderMaterial({

    uniforms: this.convolutionUniforms,
    vertexShader: convolutionShader.vertexShader,
    fragmentShader: convolutionShader.fragmentShader,
    defines: {
      "KERNEL_SIZE_FLOAT": kernelSize.toFixed(1),
      "KERNEL_SIZE_INT": kernelSize.toFixed(0)
    }

  });

  this.needsSwap = false;

  this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.scene = new THREE.Scene();

  this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  this.scene.add(this.quad);
};

THREE.BloomPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {

  constructor: THREE.BloomPass,

  render: function render(renderer, writeBuffer, readBuffer, delta, maskActive) {

    if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST);

    // Render quad with blured scene into texture (convolution pass 1)

    this.quad.material = this.materialConvolution;

    this.convolutionUniforms["tDiffuse"].value = readBuffer.texture;
    this.convolutionUniforms["uImageIncrement"].value = THREE.BloomPass.blurX;

    renderer.render(this.scene, this.camera, this.renderTargetX, true);

    // Render quad with blured scene into texture (convolution pass 2)

    this.convolutionUniforms["tDiffuse"].value = this.renderTargetX.texture;
    this.convolutionUniforms["uImageIncrement"].value = THREE.BloomPass.blurY;

    renderer.render(this.scene, this.camera, this.renderTargetY, true);

    // Render original scene with superimposed blur to texture

    this.quad.material = this.materialCopy;

    this.copyUniforms["tDiffuse"].value = this.renderTargetY.texture;

    if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST);

    renderer.render(this.scene, this.camera, readBuffer, this.clear);
  }

});

THREE.BloomPass.blurX = new THREE.Vector2(0.001953125, 0.0);
THREE.BloomPass.blurY = new THREE.Vector2(0.0, 0.001953125);

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

THREE.CopyShader = {

  uniforms: {

    "tDiffuse": { type: "t", value: null },
    "opacity": { type: "f", value: 1.0 }

  },

  vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),

  fragmentShader: ["uniform float opacity;", "uniform sampler2D tDiffuse;", "varying vec2 vUv;", "void main() {", "vec4 texel = texture2D( tDiffuse, vUv );", "gl_FragColor = opacity * texel;", "}"].join("\n")

};

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Convolution shader
 * ported from o3d sample to WebGL / GLSL
 * http://o3d.googlecode.com/svn/trunk/samples/convolution.html
 */

THREE.ConvolutionShader = {

  defines: {

    "KERNEL_SIZE_FLOAT": "25.0",
    "KERNEL_SIZE_INT": "25"

  },

  uniforms: {

    "tDiffuse": { type: "t", value: null },
    "uImageIncrement": { type: "v2", value: new THREE.Vector2(0.001953125, 0.0) },
    "cKernel": { type: "fv1", value: [] }

  },

  vertexShader: ["uniform vec2 uImageIncrement;", "varying vec2 vUv;", "void main() {", "vUv = uv - ( ( KERNEL_SIZE_FLOAT - 1.0 ) / 2.0 ) * uImageIncrement;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),

  fragmentShader: ["uniform float cKernel[ KERNEL_SIZE_INT ];", "uniform sampler2D tDiffuse;", "uniform vec2 uImageIncrement;", "varying vec2 vUv;", "void main() {", "vec2 imageCoord = vUv;", "vec4 sum = vec4( 0.0, 0.0, 0.0, 0.0 );", "for( int i = 0; i < KERNEL_SIZE_INT; i ++ ) {", "sum += texture2D( tDiffuse, imageCoord ) * cKernel[ i ];", "imageCoord += uImageIncrement;", "}", "gl_FragColor = sum;", "}"].join("\n"),

  buildKernel: function buildKernel(sigma) {

    // We lop off the sqrt(2 * pi) * sigma term, since we're going to normalize anyway.

    function gauss(x, sigma) {

      return Math.exp(-(x * x) / (2.0 * sigma * sigma));
    }

    var i,
        values,
        sum,
        halfWidth,
        kMaxKernelSize = 25,
        kernelSize = 2 * Math.ceil(sigma * 3.0) + 1;

    if (kernelSize > kMaxKernelSize) kernelSize = kMaxKernelSize;
    halfWidth = (kernelSize - 1) * 0.5;

    values = new Array(kernelSize);
    sum = 0.0;
    for (i = 0; i < kernelSize; ++i) {

      values[i] = gauss(i - halfWidth, sigma);
      sum += values[i];
    }

    // normalize the kernel

    for (i = 0; i < kernelSize; ++i) {
      values[i] /= sum;
    }return values;
  }

};