import { Voxel, VoxelPhysicsHelper } from './voxel';

//print(makeHello("main.server.ts"));

const size = 6;

function iterateTest(func: (vector3: Vector3) => void): void {
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < 1; z++) {
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
