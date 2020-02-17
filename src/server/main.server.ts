import { Voxel } from './voxel';

//print(makeHello("main.server.ts"));

for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
            new Voxel(new Vector3(x, y, z));
        }
    }
}
