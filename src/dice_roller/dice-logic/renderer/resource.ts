import { BufferGeometry, Material, Mesh, Object3D, Texture, type Object3DEventMap } from 'three';

type Disposable = { dispose: () => void };
type Trackable =
    | Mesh<BufferGeometry, Material | Material[]>
    | Material
    | Object3D<Object3DEventMap>;

type TrackedResource = Trackable | Disposable;

export class ResourceTracker {
    resources: Map<TrackedResource, TrackedResource[]> = new Map();

    constructor() {}

    isTracking(resource: TrackedResource): boolean {
        return this.resources.has(resource);
    }

    #track(resource: TrackedResource, parent?: TrackedResource): void {
        const key = parent ?? resource;
        const children = this.resources.get(key) ?? [];
        this.resources.set(key, children);
    }

    #trackArray(resources: TrackedResource[], parent?: TrackedResource): void {
        for (const r of resources) {
            if (parent !== undefined) {
                const children = this.resources.get(parent) ?? [];
                children.push(r);
            }
            this.#track(r, parent);
        }
    }

    track(resource: TrackedResource): TrackedResource {
        if (resource && typeof resource === 'object' && 'dispose' in resource) {
            this.#track(resource);
        }

        if (resource instanceof Object3D) {
            this.#track(resource);
        }

        if (resource && typeof resource === 'object' && 'geometry' in resource) {
            const r = resource as unknown as { geometry: unknown };
            this.#track(r.geometry as TrackedResource, resource);
        }

        if (resource && typeof resource === 'object' && 'material' in resource) {
            const r = resource as unknown as { material: Material | Material[] };
            if (Array.isArray(r.material)) {
                this.#trackArray(r.material as TrackedResource[], resource);
            } else {
                this.#track(r.material as TrackedResource, resource);
            }
        }

        if (resource && typeof resource === 'object' && 'children' in resource) {
            const r = resource as unknown as { children: unknown[] };
            this.#trackArray(r.children as TrackedResource[], resource);
        }

        if (resource instanceof Material) {
            const material = resource as unknown as Record<string, unknown>;
            for (const value of Object.values(material)) {
                if (value instanceof Texture) {
                    this.#track(value);
                }
            }
        }

        return resource;
    }

    untrack(resource: TrackedResource): void {
        this.resources.delete(resource);
    }

    dispose(): void {
        for (const [resource] of this.resources) {
            this.disposeResource(resource);
        }
        this.resources.clear();
    }

    disposeResource(resource: TrackedResource): void {
        if (resource && typeof resource === 'object' && 'parent' in resource) {
            const r = resource as unknown as { parent: { remove: (obj: unknown) => void } };
            if (r.parent) {
                r.parent.remove(resource);
            }
        }

        if (resource && typeof resource === 'object' && 'dispose' in resource) {
            const r = resource as unknown as { dispose: () => void };
            r.dispose();
        }

        const children = this.resources.get(resource);
        if (children) {
            for (const child of children) {
                this.disposeResource(child);
            }
        }

        this.resources.delete(resource);
    }
}
