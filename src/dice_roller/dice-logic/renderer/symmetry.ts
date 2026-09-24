import { Matrix4, Quaternion, Vector3 } from 'three';

const EPSILON = 1e-3;

/** Right-handed orthonormal frame with `axis` first and `toward` fixing the second axis. */
function frame(axis: Vector3, toward: Vector3): Matrix4 {
    const x = axis.clone().normalize();
    const y = toward
        .clone()
        .sub(x.clone().multiplyScalar(toward.dot(x)))
        .normalize();
    const z = x.clone().cross(y);
    return new Matrix4().makeBasis(x, y, z);
}

function mapsOntoItself(normals: Vector3[], rotation: Quaternion): boolean {
    const turned = new Vector3();
    return normals.every((normal) => {
        turned.copy(normal).applyQuaternion(rotation);
        return normals.some((other) => other.distanceToSquared(turned) < EPSILON);
    });
}

/**
 * A rotation of the die onto itself that carries face `from` to face `to`: a symmetry of the
 * polyhedron, so the turned mesh fills the same space and keeps its layout (opposite faces of
 * a d6 still add to 7). Every supported die is face-transitive, so one exists between any two
 * faces; `null` only for faces of different kinds.
 */
export function faceTurn(
    normals: ReadonlyMap<number, Vector3>,
    from: number,
    to: number,
    /** Every surface normal of the die (blank faces too); used when the faces alone cannot fix a turn. */
    surface: readonly Vector3[] = [...normals.values()]
): Quaternion | null {
    const source = normals.get(from);
    const target = normals.get(to);
    if (!source || !target) return null;
    if (from === to) return new Quaternion();

    // A coin has only two, opposite, numbered faces: its rim fixes the flip. Other dice use
    // the numbered faces alone; their chamfers are not built to exact symmetry.
    const all = normals.size > 2 ? [...normals.values()] : [...surface];
    // A reference face next to `from` pins the rotation about the face axis.
    const reference = all
        .filter((normal) => Math.abs(normal.dot(source)) < 1 - EPSILON)
        .sort((a, b) => b.dot(source) - a.dot(source))[0];
    if (!reference) return null;
    const angle = reference.dot(source);

    const fromFrame = frame(source, reference);
    const inverse = fromFrame.clone().transpose();
    for (const candidate of all) {
        if (Math.abs(candidate.dot(target) - angle) > EPSILON) continue;
        if (Math.abs(candidate.dot(target)) >= 1 - EPSILON) continue;
        const rotation = new Quaternion().setFromRotationMatrix(
            frame(target, candidate).multiply(inverse)
        );
        if (mapsOntoItself(all, rotation)) return rotation;
    }
    return null;
}
