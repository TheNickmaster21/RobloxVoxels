import { Voxel, VoxelPhysicsHelper } from './voxel';

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
