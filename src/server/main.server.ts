import { Voxel, VoxelPhysicsHelper } from './voxel';

//print(makeHello("main.server.ts"));

const size = 16;

function iterateTest(func: (vector3: Vector3) => void): void {
    for (let x = 0; x < 1; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                func(new Vector3(x, y, z));
            }
        }
    }
}

iterateTest((v) => new Voxel(v));
iterateTest((v) => VoxelPhysicsHelper.calculateVoxelPhysics(Voxel.getVoxel(v)!));

VoxelPhysicsHelper.SETUP_DONE = true;

// const a = [ 'a', 'b', 'c', 'd', 'e' ];

// a.forEach(print);
// a.splice(2, 1);
// a.forEach(print);

print(new Vector3(0, 0, 0).FuzzyEq(new Vector3(0, 0, 0), 0));
print(new Vector3(0, 0, 0).FuzzyEq(new Vector3(0, 0, 0), 1e-1));
print(new Vector3(0, 0, 0).FuzzyEq(new Vector3(0, 0, 0), 1e-2));
