import { Body, ConvexPolyhedron, Vec3 } from 'cannon-es';
import {
    BufferGeometry,
    Float32BufferAttribute,
    Mesh,
    MeshPhongMaterial,
    Sphere,
    Texture,
    Vector3,
} from 'three';
import { debug } from '../../utils/logging';
import { fixBrightness } from '../../utils/recolor_svg';

const MATERIAL_OPTIONS = {
    specular: 0x172022,
    color: 0xffffff,
    shininess: 60,
    flatShading: true,
};

const DEFAULT_DICE_OPTIONS: DiceOptions = {
    diceColor: '#202020',
    textColor: '#ffffff',
    textFont: 'Arial',
    narrativeSymbolSet: 'Genesys',
};

interface DiceOptions {
    diceColor: string;
    textColor: string;
    textFont: string;
    narrativeSymbolSet: string;
}

export interface DiceGeometryData {
    body: Body;
    geometry: Mesh;
    values: number[];
}

const textureCache = new Map<string, Texture>();

export function clearTextureCache(): void {
    textureCache.forEach((texture) => texture.dispose());
    textureCache.clear();
}

export default abstract class DiceGeometry {
    body!: Body;
    chamferGeometry!: { vectors: Vector3[]; faces: number[][] };
    geometry!: Mesh;
    scale = 50;
    shape!: ConvexPolyhedron;
    textureSize!: number;
    shapeData!: { vertices: Vec3[]; faces: number[][] };

    abstract af: number;
    abstract chamfer: number;
    abstract faces: number[][];

    labels = [
        ' ',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '20',
    ];

    abstract margin: number;
    abstract mass: number;
    abstract sides: number;
    abstract scaleFactor: number;
    abstract tab: number;
    abstract values: number[];
    abstract vertices: number[][];

    w!: number;
    h!: number;
    options!: Partial<DiceOptions>;
    scaler!: number;
    fontFace = 'Arial';

    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: '#202020',
            textColor: '#aaaaaa',
            narrativeSymbolSet: 'Genesys',
        },
        scaler: number
    ) {
        this.w = w;
        this.h = h;
        this.scaler = scaler;
        this.options = {
            ...DEFAULT_DICE_OPTIONS,
            ...options,
        };
        this.fontFace = this.options.textFont!;
    }

    get radius(): number {
        return this.scale * this.scaleFactor * (this.scaler ?? 1);
    }

    get diceColor(): string {
        return this.options.diceColor!;
    }

    get textColor(): string {
        return this.options.textColor!;
    }

    get narrativeSymbolSet(): string {
        return this.options.narrativeSymbolSet!;
    }

    get buffer(): BufferGeometry {
        return this.geometry.geometry as BufferGeometry;
    }

    create(): this {
        debug(`DiceGeometry: Creating ${this.sides}-sided die`);
        this.textureSize = this.calculateTextureSize(this.scale / 2 + this.scale * this.margin) * 2;

        const geometry = this.getGeometry();
        const materials = this.getMaterials();
        debug(
            `DiceGeometry: Got ${materials.length} materials, geometry groups: ${geometry.groups.length}`
        );
        this.geometry = new Mesh(geometry, materials);
        this.geometry.receiveShadow = true;
        this.geometry.castShadow = true;

        // Set reasonable initial position and zero velocity
        // Velocity will be set by DiceShape.create()
        this.body.position.set(0, 0, 100);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.linearDamping = 0.1;
        this.body.angularDamping = 0.1;

        debug(`DiceGeometry: Body created, mass: ${this.body.mass}, radius: ${this.radius}`);
        return this;
    }

    getGeometry(): BufferGeometry {
        const vectors = new Array(this.vertices.length);
        for (let i = 0; i < this.vertices.length; ++i) {
            vectors[i] = new Vector3().fromArray(this.vertices[i]).normalize();
        }

        this.chamferGeometry = this.getChamferGeometry(vectors);
        const geometry = this.makeGeometry(
            this.chamferGeometry.vectors,
            this.chamferGeometry.faces
        );

        this.shape = this.makeShape(vectors);

        this.body = new Body({
            mass: this.mass,
            shape: this.shape,
        });
        // Material will be set by PhysicsWorld when added

        return geometry;
    }

    makeShape(vertices: Vector3[]): ConvexPolyhedron {
        const cv = new Array(vertices.length);
        const cf = new Array(this.faces.length);
        for (let i = 0; i < vertices.length; ++i) {
            const v = vertices[i];
            cv[i] = new Vec3(v.x * this.radius, v.y * this.radius, v.z * this.radius);
        }
        for (let i = 0; i < this.faces.length; ++i) {
            cf[i] = this.faces[i].slice(0, this.faces[i].length - 1);
        }
        this.shapeData = { vertices: cv, faces: cf };
        return new ConvexPolyhedron({ vertices: cv, faces: cf });
    }

    getChamferGeometry(vectors: Vector3[]): {
        vectors: Vector3[];
        faces: number[][];
    } {
        const chamferVectors: Vector3[] = [];
        const chamferFaces: number[][] = [];
        const cornerFaces: number[][] = new Array(vectors.length);
        for (let i = 0; i < vectors.length; ++i) cornerFaces[i] = [];

        for (let i = 0; i < this.faces.length; ++i) {
            const ii = this.faces[i];
            const fl = ii.length - 1;
            const centerPoint = new Vector3();
            const face: number[] = new Array(fl);

            for (let j = 0; j < fl; ++j) {
                const vv = vectors[ii[j]].clone();
                centerPoint.add(vv);
                cornerFaces[ii[j]].push((face[j] = chamferVectors.push(vv) - 1));
            }
            centerPoint.divideScalar(fl);

            for (let j = 0; j < fl; ++j) {
                const vv = chamferVectors[face[j]];
                vv.subVectors(vv, centerPoint)
                    .multiplyScalar(this.chamfer)
                    .addVectors(vv, centerPoint);
            }
            face.push(ii[fl]);
            chamferFaces.push(face);
        }

        for (let i = 0; i < this.faces.length - 1; ++i) {
            for (let j = i + 1; j < this.faces.length; ++j) {
                const pairs: number[][] = [];
                let lastm = -1;
                for (let m = 0; m < this.faces[i].length - 1; ++m) {
                    const n = this.faces[j].indexOf(this.faces[i][m]);
                    if (n >= 0 && n < this.faces[j].length - 1) {
                        if (lastm >= 0 && m !== lastm + 1) pairs.unshift([i, m], [j, n]);
                        else pairs.push([i, m], [j, n]);
                        lastm = m;
                    }
                }
                if (pairs.length !== 4) continue;
                chamferFaces.push([
                    chamferFaces[pairs[0][0]][pairs[0][1]],
                    chamferFaces[pairs[1][0]][pairs[1][1]],
                    chamferFaces[pairs[3][0]][pairs[3][1]],
                    chamferFaces[pairs[2][0]][pairs[2][1]],
                    -1,
                ]);
            }
        }

        for (let i = 0; i < cornerFaces.length; ++i) {
            const cf = cornerFaces[i];
            const face = [cf[0]];
            let count = cf.length - 1;
            while (count) {
                for (let m = this.faces.length; m < chamferFaces.length; ++m) {
                    const index = chamferFaces[m].indexOf(face[face.length - 1]);
                    if (index >= 0 && index < 4) {
                        let nextIndex = index - 1;
                        if (nextIndex === -1) nextIndex = 3;
                        const nextVertex = chamferFaces[m][nextIndex];
                        if (cf.indexOf(nextVertex) >= 0) {
                            face.push(nextVertex);
                            break;
                        }
                    }
                }
                --count;
            }
            face.push(-1);
            chamferFaces.push(face);
        }

        return { vectors: chamferVectors, faces: chamferFaces };
    }

    makeGeometry(vertices: Vector3[], faces: number[][]): BufferGeometry {
        const geom = new BufferGeometry();

        for (let i = 0; i < vertices.length; ++i) {
            vertices[i] = vertices[i].multiplyScalar(this.radius);
        }

        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];

        const cb = new Vector3();
        const ab = new Vector3();
        let faceFirstVertexIndex = 0;

        for (let i = 0; i < faces.length; ++i) {
            const ii = faces[i];
            const fl = ii.length - 1;
            const aa = (Math.PI * 2) / fl;
            const materialIndex = ii[fl] + 1;

            for (let j = 0; j < fl - 2; ++j) {
                positions.push(...vertices[ii[0]].toArray());
                positions.push(...vertices[ii[j + 1]].toArray());
                positions.push(...vertices[ii[j + 2]].toArray());

                cb.subVectors(vertices[ii[j + 2]], vertices[ii[j + 1]]);
                ab.subVectors(vertices[ii[0]], vertices[ii[j + 1]]);
                cb.cross(ab);
                cb.normalize();

                normals.push(...cb.toArray());
                normals.push(...cb.toArray());
                normals.push(...cb.toArray());

                uvs.push(
                    (Math.cos(this.af) + 1 + this.tab) / 2 / (1 + this.tab),
                    (Math.sin(this.af) + 1 + this.tab) / 2 / (1 + this.tab)
                );
                uvs.push(
                    (Math.cos(aa * (j + 1) + this.af) + 1 + this.tab) / 2 / (1 + this.tab),
                    (Math.sin(aa * (j + 1) + this.af) + 1 + this.tab) / 2 / (1 + this.tab)
                );
                uvs.push(
                    (Math.cos(aa * (j + 2) + this.af) + 1 + this.tab) / 2 / (1 + this.tab),
                    (Math.sin(aa * (j + 2) + this.af) + 1 + this.tab) / 2 / (1 + this.tab)
                );
            }

            const numOfVertices = (fl - 2) * 3;
            for (let k = 0; k < numOfVertices / 3; k++) {
                geom.addGroup(faceFirstVertexIndex, 3, materialIndex);
                faceFirstVertexIndex += 3;
            }
        }

        geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geom.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        geom.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        geom.boundingSphere = new Sphere(new Vector3(), this.radius);
        return geom;
    }

    getMaterials(): MeshPhongMaterial[] {
        const materials: MeshPhongMaterial[] = [];
        for (let i = 0; i < this.labels.length; i++) {
            const texture = this.createTexture(i);
            materials.push(
                new MeshPhongMaterial(
                    Object.assign({}, MATERIAL_OPTIONS, {
                        map: texture,
                        transparent: true,
                        opacity: 1.0,
                    })
                )
            );
        }
        return materials;
    }

    calculateTextureSize(approx: number): number {
        return Math.max(128, Math.pow(2, Math.floor(Math.log(approx) / Math.log(2))));
    }

    createTexture(index: number): Texture | null {
        const text = this.labels[index];
        if (text == undefined) return null;

        const cacheKey = `texture_${this.sides}_${this.textureSize}_${index}_${this.diceColor}_${this.textColor}_${text}`;
        if (textureCache.has(cacheKey)) {
            return textureCache.get(cacheKey)!;
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = this.textureSize;
        let textStartY = this.textureSize / 2;
        const textStartX = this.textureSize / 2;

        const context = canvas.getContext('2d', { alpha: true })!;
        context.clearRect(0, 0, canvas.width, canvas.height);

        let fontsize = canvas.width / (1 + 2 * this.margin);
        if (this.sides === 100) {
            fontsize *= 0.75;
        }
        context.font = `${fontsize}pt '${this.fontFace}'`;

        context.fillStyle = fixBrightness(this.diceColor, -10);
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        if (this.sides === 10 || this.sides === 100) {
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate((60 * Math.PI) / 180);
            context.translate(-canvas.width / 2, -canvas.height / 2);
        }
        context.fillStyle = this.textColor;

        const lineHeight = context.measureText('M').width * 1.4;
        const textlines = text.split('\n');

        if (textlines.length > 1) {
            const adjustedFontsize = fontsize / textlines.length;
            context.font = `${adjustedFontsize}pt '${this.fontFace}'`;
            const adjustedLineHeight = context.measureText('M').width * 1.2;
            textStartY -= (adjustedLineHeight * textlines.length) / 2;
        }

        for (let i = 0, l = textlines.length; i < l; i++) {
            const textline = textlines[i].trim();
            context.fillText(textlines[i], textStartX, textStartY);

            if (textline === '6' || textline === '9') {
                context.fillText('  .', textStartX, textStartY);
            }
            textStartY += lineHeight * 1.5;
        }

        const texture = new Texture(canvas);
        texture.needsUpdate = true;
        textureCache.set(cacheKey, texture);
        return texture;
    }

    clone(): DiceGeometryData {
        const existingMaterial = this.body?.material ?? undefined;
        const clonedBody = new Body({
            mass: this.mass,
            shape: this.shape,
            material: existingMaterial,
        });
        const clonedGeometry = this.geometry.clone();
        if (Array.isArray(clonedGeometry.material)) {
            clonedGeometry.material = clonedGeometry.material.map((m) => m.clone());
        } else {
            clonedGeometry.material = clonedGeometry.material.clone();
        }
        return {
            body: clonedBody,
            geometry: clonedGeometry,
            values: this.values,
        };
    }
}

export class D20DiceGeometry extends DiceGeometry {
    sides = 20;
    tab = -0.2;
    af = -Math.PI / 4 / 2;
    chamfer = 0.955;
    vertices: number[][] = [];
    faces = [
        [0, 11, 5, 1],
        [0, 5, 1, 2],
        [0, 1, 7, 3],
        [0, 7, 10, 4],
        [0, 10, 11, 5],
        [1, 5, 9, 6],
        [5, 11, 4, 7],
        [11, 10, 2, 8],
        [10, 7, 6, 9],
        [7, 1, 8, 10],
        [3, 9, 4, 11],
        [3, 4, 2, 12],
        [3, 2, 6, 13],
        [3, 6, 8, 14],
        [3, 8, 9, 15],
        [4, 9, 5, 16],
        [2, 4, 11, 17],
        [6, 2, 10, 18],
        [8, 6, 7, 19],
        [9, 8, 1, 20],
    ];
    scaleFactor = 1;
    values = [...Array(20).keys()];
    margin = 1;
    mass = 400;

    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: '#171120',
            textColor: '#FF0000',
        },
        scaler: number
    ) {
        super(w, h, options, scaler);

        const t = (1 + Math.sqrt(5)) / 2;
        this.vertices = [
            [-1, t, 0],
            [1, t, 0],
            [-1, -t, 0],
            [1, -t, 0],
            [0, -1, t],
            [0, 1, t],
            [0, -1, -t],
            [0, 1, -t],
            [t, 0, -1],
            [t, 0, 1],
            [-t, 0, -1],
            [-t, 0, 1],
        ];
    }
}

export class D12DiceGeometry extends DiceGeometry {
    mass = 350;
    sides = 12;
    tab = 0.2;
    af = -Math.PI / 4 / 2;
    chamfer = 0.968;
    vertices: number[][] = [];
    faces = [
        [2, 14, 4, 12, 0, 1],
        [15, 9, 11, 19, 3, 2],
        [16, 10, 17, 7, 6, 3],
        [6, 7, 19, 11, 18, 4],
        [6, 18, 2, 0, 16, 5],
        [18, 11, 9, 14, 2, 6],
        [1, 17, 10, 8, 13, 7],
        [1, 13, 5, 15, 3, 8],
        [13, 8, 12, 4, 5, 9],
        [5, 4, 14, 9, 15, 10],
        [0, 12, 8, 10, 16, 11],
        [3, 19, 7, 17, 1, 12],
    ];
    scaleFactor = 0.9;
    values = [...Array(12).keys()];
    margin = 1;

    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: '#7339BE',
            textColor: '#FFFFFF',
        },
        scaler: number
    ) {
        super(w, h, options, scaler);

        const p = (1 + Math.sqrt(5)) / 2;
        const q = 1 / p;
        this.vertices = [
            [0, q, p],
            [0, q, -p],
            [0, -q, p],
            [0, -q, -p],
            [p, 0, q],
            [p, 0, -q],
            [-p, 0, q],
            [-p, 0, -q],
            [q, p, 0],
            [q, -p, 0],
            [-q, p, 0],
            [-q, -p, 0],
            [1, 1, 1],
            [1, 1, -1],
            [1, -1, 1],
            [1, -1, -1],
            [-1, 1, 1],
            [-1, 1, -1],
            [-1, -1, 1],
            [-1, -1, -1],
        ];
    }
}

export class D10DiceGeometry extends DiceGeometry {
    mass = 350;
    sides = 10;
    tab = 0;
    af = (-Math.PI * 6) / 5;
    chamfer = 0.945;
    vertices: number[][] = [];
    faces = [
        [5, 7, 11, 0],
        [4, 2, 10, 1],
        [1, 3, 11, 2],
        [0, 8, 10, 3],
        [7, 9, 11, 4],
        [8, 6, 10, 5],
        [9, 1, 11, 6],
        [2, 0, 10, 7],
        [3, 5, 11, 8],
        [6, 4, 10, 9],
        [1, 0, 2, -1],
        [1, 2, 3, -1],
        [3, 2, 4, -1],
        [3, 4, 5, -1],
        [5, 4, 6, -1],
        [5, 6, 7, -1],
        [7, 6, 8, -1],
        [7, 8, 9, -1],
        [9, 8, 0, -1],
        [9, 0, 1, -1],
    ];
    scaleFactor = 0.9;
    values = [...Array(10).keys()];
    margin = 1;

    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: '#c74749',
            textColor: '#FFFFFF',
        },
        scaler: number
    ) {
        super(w, h, options, scaler);
        for (let i = 0, b = 0; i < 10; ++i, b += (Math.PI * 2) / 10) {
            this.vertices.push([Math.cos(b), Math.sin(b), 0.105 * (i % 2 ? 1 : -1)]);
        }
        this.vertices.push([0, 0, -1]);
        this.vertices.push([0, 0, 1]);
    }
}

export class D100DiceGeometry extends D10DiceGeometry {
    labels = ['', '00', '10', '20', '30', '40', '50', '60', '70', '80', '90'];
    sides = 100;
}

export class D8DiceGeometry extends DiceGeometry {
    mass = 340;
    sides = 8;
    tab = 0;
    af = -Math.PI / 4 / 2;
    chamfer = 0.965;
    vertices = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
    ];
    faces = [
        [0, 2, 4, 1],
        [0, 4, 3, 2],
        [0, 3, 5, 3],
        [0, 5, 2, 4],
        [1, 3, 4, 5],
        [1, 4, 2, 6],
        [1, 2, 5, 7],
        [1, 5, 3, 8],
    ];
    scaleFactor = 1;
    values = [...Array(8).keys()];
    margin = 1.2;

    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: '#5eb0c5',
            textColor: '#FFFFFF',
        },
        scaler: number
    ) {
        super(w, h, options, scaler);
    }
}

export class D6DiceGeometry extends DiceGeometry {
    mass = 300;
    tab = 0.1;
    af = Math.PI / 4;
    chamfer = 0.96;
    vertices = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1],
    ];
    faces = [
        [0, 3, 2, 1, 1],
        [1, 2, 6, 5, 2],
        [0, 1, 5, 4, 3],
        [3, 7, 6, 2, 4],
        [0, 4, 7, 3, 5],
        [4, 5, 6, 7, 6],
    ];
    scaleFactor = 0.9;
    sides = 6;
    margin = 1.0;
    values = [...Array(6).keys()];
    labels = [' ', ' ', '1', '2', '3', '4', '5', '6'];

    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: '#d68316',
            textColor: '#FFFFFF',
        },
        scaler: number
    ) {
        super(w, h, options, scaler);
    }
}

export class D4DiceGeometry extends DiceGeometry {
    mass = 300;
    tab = -0.1;
    af = (Math.PI * 7) / 6;
    chamfer = 0.96;
    vertices = [
        [1, 1, 1],
        [-1, -1, 1],
        [-1, 1, -1],
        [1, -1, -1],
    ];
    faces = [
        [1, 0, 2, 1],
        [0, 1, 3, 2],
        [0, 3, 2, 3],
        [1, 2, 3, 4],
    ];
    scaleFactor = 1.2;
    sides = 4;
    margin = 1.0;
    faceTexts = [[], [], [2, 4, 3], [1, 3, 4], [2, 1, 4], [1, 2, 3]];
    values = [...Array(4).keys()];

    constructor(
        w: number,
        h: number,
        options: Partial<DiceOptions> = {
            diceColor: '#93b139',
            textColor: '#FFFFFF',
        },
        scaler: number
    ) {
        super(w, h, options, scaler);
    }

    getMaterials() {
        const materials: MeshPhongMaterial[] = [];
        for (let i = 0; i < this.faceTexts.length; ++i) {
            const texture = this.createTextTexture(i);

            materials.push(
                new MeshPhongMaterial(
                    Object.assign({}, MATERIAL_OPTIONS, {
                        map: texture,
                        transparent: true,
                        opacity: 1.0,
                    })
                )
            );
        }
        return materials;
    }

    createTextTexture(index: number) {
        const cacheKey = `d4_texture_${index}_${this.diceColor}_${this.textColor}`;
        if (textureCache.has(cacheKey)) {
            return textureCache.get(cacheKey)!;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        const textStart = this.calculateTextureSize(this.radius / 2 + this.radius * 2) * 2;
        canvas.width = canvas.height = textStart;
        context.font = `${textStart / 5}pt '${this.fontFace}'`;
        context.fillStyle = fixBrightness(this.diceColor, -10);
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = this.textColor;
        for (const i in this.faceTexts[index]) {
            context.fillText(
                `${this.faceTexts[index][i]}`,
                canvas.width / 2,
                canvas.height / 2 - textStart * 0.3
            );
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate((Math.PI * 2) / 3);
            context.translate(-canvas.width / 2, -canvas.height / 2);
        }
        const texture = new Texture(canvas);
        texture.needsUpdate = true;
        textureCache.set(cacheKey, texture);
        return texture;
    }
}

export class D2DiceGeometry extends DiceGeometry {
    sides = 2;
    mass = 200;
    tab = 0;
    af = 0;
    chamfer = 0.96;
    scaleFactor = 1.0;
    margin = 1.0;
    values = [0, 1];

    vertices: number[][] = [];
    faces: number[][] = [];

    constructor(w: number, h: number, options: Partial<DiceOptions> = {}, scaler: number) {
        super(w, h, options, scaler);

        const sidesCount = 12;
        const radius = 1.0;
        const halfHeight = 0.1;

        for (let i = 0; i < sidesCount; i++) {
            const angle = (i / sidesCount) * Math.PI * 2;
            this.vertices.push([Math.cos(angle) * radius, Math.sin(angle) * radius, halfHeight]);
            this.vertices.push([Math.cos(angle) * radius, Math.sin(angle) * radius, -halfHeight]);
        }

        const topFace = Array.from({ length: sidesCount }, (_, i) => i * 2);
        topFace.push(1);

        const bottomFace = Array.from({ length: sidesCount }, (_, i) => i * 2 + 1).reverse();
        bottomFace.push(2);

        this.faces = [topFace, bottomFace];

        for (let i = 0; i < sidesCount; i++) {
            const nextI = (i + 1) % sidesCount;
            this.faces.push([i * 2, i * 2 + 1, nextI * 2 + 1, nextI * 2, -1]);
        }
    }
}
