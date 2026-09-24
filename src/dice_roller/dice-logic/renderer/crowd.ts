import { type Body, ConvexPolyhedron, Sphere } from 'cannon-es';

/** Collision groups: static table and walls, die hulls, and die-to-die proxies. */
const STATIC = 1;
const HULL = 2;
const PROXY = 4;

function inradius(hull: ConvexPolyhedron): number {
    let nearest = Infinity;
    hull.faces.forEach((face, index) => {
        const normal = hull.faceNormals[index];
        const vertex = hull.vertices[face[0]];
        if (normal && vertex) nearest = Math.min(nearest, Math.abs(normal.dot(vertex)));
    });
    return Number.isFinite(nearest) ? nearest : hull.boundingSphereRadius;
}

/**
 * In a large pool dice collide with each other as spheres and with the table and walls as
 * their real hulls (dice #12). Hull-to-hull contact tests dominate a pile's frame time; a
 * sphere between the die's inscribed and circumscribed spheres keeps dice from sinking into
 * each other while the hull still decides which face lands up.
 */
export function applyCrowdCollisions(body: Body): void {
    const [hull] = body.shapes;
    if (!(hull instanceof ConvexPolyhedron) || body.shapes.length > 1) return;
    hull.collisionFilterGroup = HULL;
    hull.collisionFilterMask = STATIC;
    const proxy = new Sphere((inradius(hull) + hull.boundingSphereRadius) / 2);
    proxy.collisionFilterGroup = PROXY;
    proxy.collisionFilterMask = PROXY;
    body.addShape(proxy);
}
