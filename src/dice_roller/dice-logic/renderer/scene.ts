import {
    AmbientLight,
    DirectionalLight,
    Mesh,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    ShadowMaterial,
    Vector3,
    WebGLRenderer,
    PCFShadowMap,
    CameraHelper,
} from 'three';

export class SceneManager {
    renderer: WebGLRenderer;
    scene: Scene;
    camera!: PerspectiveCamera;
    ambientLight!: AmbientLight;
    directionalLight!: DirectionalLight;
    desk!: Mesh;
    shadows = true;

    display: { [key: string]: number } = {
        currentWidth: 0,
        currentHeight: 0,
        containerWidth: 0,
        containerHeight: 0,
        aspect: 0,
        scale: 0,
    };

    cameraHeight: { [key: string]: number } = {
        max: 0,
        close: 0,
        medium: 0,
        far: 0,
    };

    constructor() {
        this.renderer = new WebGLRenderer({
            alpha: true,
            antialias: true,
        });
        this.renderer.shadowMap.enabled = this.shadows;
        this.renderer.shadowMap.type = PCFShadowMap;
        this.scene = new Scene();
    }

    get WIDTH(): number {
        return this.display.currentWidth;
    }

    get HEIGHT(): number {
        return this.display.currentHeight;
    }

    get canvasEl(): HTMLCanvasElement | null {
        return this.renderer.domElement;
    }

    setDimensions(width: number, height: number): void {
        this.display.currentWidth = width / 2;
        this.display.currentHeight = height / 2;
        this.display.containerWidth = this.display.currentWidth;
        this.display.containerHeight = this.display.currentHeight;

        this.display.aspect = Math.min(
            this.display.currentWidth / this.display.containerWidth,
            this.display.currentHeight / this.display.containerHeight
        );
        this.display.scale =
            Math.sqrt(
                this.display.containerWidth * this.display.containerWidth +
                    this.display.containerHeight * this.display.containerHeight
            ) / 13;

        this.renderer.setSize(this.display.currentWidth * 2, this.display.currentHeight * 2);

        this.cameraHeight.max =
            this.display.currentHeight / this.display.aspect / Math.tan((10 * Math.PI) / 180);

        this.cameraHeight.medium = this.cameraHeight.max / 1.5;
        this.cameraHeight.far = this.cameraHeight.max;
        this.cameraHeight.close = this.cameraHeight.max / 2;
    }

    initCamera(diceCount?: number): void {
        if (this.camera) this.scene.remove(this.camera);
        this.camera = new PerspectiveCamera(
            35,
            this.display.currentWidth / this.display.currentHeight,
            10,
            this.cameraHeight.max * 1.3
        );

        let z = this.cameraHeight.medium;
        if (diceCount !== undefined) {
            if (diceCount <= 3) z = this.cameraHeight.close;
            else if (diceCount >= 10) z = this.cameraHeight.far;
        }
        this.camera.position.z = z;
        this.camera.lookAt(new Vector3(0, 0, 0));
    }

    getCameraInfo(): { z: number; fov: number; aspect: number } | null {
        if (!this.camera) return null;
        return {
            z: this.camera.position.z,
            fov: this.camera.fov,
            aspect: this.display.currentWidth / this.display.currentHeight,
        };
    }

    initLighting(): void {
        const maxwidth = Math.max(this.display.containerWidth, this.display.containerHeight);

        if (this.ambientLight) this.scene.remove(this.ambientLight);
        if (this.directionalLight) this.scene.remove(this.directionalLight);

        this.directionalLight = new DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(-maxwidth / 2, maxwidth / 2, maxwidth);
        this.directionalLight.castShadow = this.shadows;
        this.directionalLight.shadow.camera.near = maxwidth / 10;
        this.directionalLight.shadow.camera.far = maxwidth * 5;
        this.directionalLight.shadow.camera.left = -maxwidth;
        this.directionalLight.shadow.camera.right = maxwidth;
        this.directionalLight.shadow.camera.top = maxwidth;
        this.directionalLight.shadow.camera.bottom = -maxwidth;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.bias = 0.001;
        this.scene.add(this.directionalLight);

        if (process.env.NODE_ENV !== 'production') {
            const shadowCameraHelper = new CameraHelper(this.directionalLight.shadow.camera);
            this.scene.add(shadowCameraHelper);
        }

        this.ambientLight = new AmbientLight(0xffffff, 0.2);
        this.scene.add(this.ambientLight);
    }

    initDesk(): void {
        if (this.desk) this.scene.remove(this.desk);
        const shadowplane = new ShadowMaterial();
        shadowplane.opacity = 0.3;
        this.desk = new Mesh(
            new PlaneGeometry(
                this.display.containerWidth * 6,
                this.display.containerHeight * 6,
                1,
                1
            ),
            shadowplane
        );
        this.desk.receiveShadow = this.shadows;
        this.scene.add(this.desk);
    }

    initScene(width: number, height: number): void {
        this.setDimensions(width, height);
        this.initCamera();
        this.initLighting();
        this.initDesk();
        this.camera.updateProjectionMatrix();
    }

    render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    add(...mesh: Mesh[]): void {
        this.scene.add(...mesh);
    }

    remove(...mesh: Mesh[]): void {
        this.scene.remove(...mesh);
    }

    dispose(): void {
        this.renderer.dispose();
        this.scene.clear();
    }
}
