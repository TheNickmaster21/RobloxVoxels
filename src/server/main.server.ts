import { Voxel, VoxelPhysicsHelper } from './voxel';

//print(makeHello("main.server.ts"));

const size = 6;

function iterateTest(func: (vector3: Vector3) => void): void {
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                func(new Vector3(x, y, z));
            }
        }
    }
}

iterateTest((v) => new Voxel(v));
iterateTest(
    (v) =>
        Voxel.getVoxel(v) !== undefined ? VoxelPhysicsHelper.calculateVoxelPhysics(Voxel.getVoxel(v)!) : print('hmm')
);
