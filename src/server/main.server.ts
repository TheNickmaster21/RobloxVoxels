import { Voxel, VoxelPhysicsHelepr } from './voxel';

//print(makeHello("main.server.ts"));

function iterateTest(func: (vector3: Vector3) => void): void {
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            for (let z = 0; z < 3; z++) {
                func(new Vector3(x, y, z));
            }
        }
    }
}

iterateTest((v) => new Voxel(v));
iterateTest((v) => VoxelPhysicsHelepr.calculateVoxelPhysics(Voxel.getVoxel(v)!));
