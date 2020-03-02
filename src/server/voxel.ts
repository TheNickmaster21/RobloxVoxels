import { PriorityQueue } from 'shared/priority-queue';

const voxelFolder = new Instance('Folder');
voxelFolder.Name = 'Voxels';
voxelFolder.Parent = game.Workspace;
voxelFolder.ChildRemoved.Connect((removedVoxel) => {
    if (removedVoxel.IsA('BasePart')) {
        const voxel = Voxel.getVoxel(removedVoxel.Position);
        if (voxel) {
            VoxelPhysicsHelper.voxelRemoved(voxel);
        }
    }
});

const TweenService = game.GetService('TweenService');

export class Voxel {
    static readonly SIZE = 1;

    static readonly UP: Vector3 = new Vector3(0, 1, 0);
    static readonly DOWN: Vector3 = new Vector3(0, -1, 0);

    static readonly SIDES: Vector3[] = [
        new Vector3(1, 0, 0),
        new Vector3(-1, 0, 0),
        new Vector3(0, 0, 1),
        new Vector3(0, 0, -1)
    ];

    static readonly NEIGHBORS: Vector3[] = Voxel.SIDES.concat([ Voxel.UP, Voxel.DOWN ]);

    private static voxels: (Voxel | undefined)[][][] = [];

    public static getVoxel(vector3: Vector3): Voxel | undefined {
        const x = vector3.X;
        const y = vector3.Y;
        const z = vector3.Z;
        return this.voxels[x] ? (this.voxels[x][y] ? this.voxels[x][y][z] : undefined) : undefined;
    }

    public static setVoxel(vector3: Vector3, voxel: Voxel | undefined): void {
        const x = vector3.X;
        const y = vector3.Y;
        const z = vector3.Z;
        if (!this.voxels[x]) this.voxels[x] = [];
        if (!this.voxels[x][y]) this.voxels[x][y] = [];
        this.voxels[x][y][z] = voxel;
    }

    public readonly physicsData: VoxelPhysicsData;
    private part: Part;
    private destroyed: boolean = false;

    constructor(public readonly position: Vector3) {
        this.part = new Instance('Part');
        this.part.Name = 'Voxel';
        this.part.Anchored = true;
        this.part.Size = new Vector3(Voxel.SIZE, Voxel.SIZE, Voxel.SIZE);
        this.part.Position = position;
        this.part.Color = new Color3(1, 1, 1);
        this.part.Parent = voxelFolder;

        this.physicsData = VoxelPhysicsHelper.getInitialVoxelPhysicsData(this);

        Voxel.setVoxel(position, this);
    }

    public getNeighbors(): Voxel[] {
        return Voxel.NEIGHBORS
            .mapFiltered((direction) => Voxel.getVoxel(this.position.add(direction)))
            .filter((voxel) => !voxel.isDestroyed());
    }

    public destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        // TODO Calculate physics for all voxels that relied on this voxel
        this.setColor(new Color3(0, 0, 0));
        const clonedPart = this.part.Clone();
        this.part.Destroy();
        clonedPart.Anchored = false;
        TweenService.Create(clonedPart, new TweenInfo(6, Enum.EasingStyle.Linear, Enum.EasingDirection.In), {
            Transparency: 1
        }).Play();
        clonedPart.Parent = game.Workspace;
        coroutine.wrap(() => {
            wait(6);
            clonedPart.Destroy();
            Voxel.setVoxel(this.position, undefined);
        })();
    }

    private setColor(color: Color3): void {
        if (this.part) {
            this.part.Color = color;
        }
    }

    public increaseLoad(): void {
        this.physicsData.load++;
        const ratio = this.physicsData.load / VoxelPhysicsHelper.MAX_LOAD;
        this.setColor(new Color3(1 - ratio, ratio, 0));
        if (this.physicsData.load > VoxelPhysicsHelper.MAX_LOAD) {
            this.destroy();
        }
    }

    public decreaseLoad(): void {
        this.physicsData.load--;
        const ratio = this.physicsData.load / VoxelPhysicsHelper.MAX_LOAD;
        this.setColor(new Color3(1 - ratio, ratio, 0));
    }

    public isDestroyed(): boolean {
        return this.destroyed;
    }
}

export interface VoxelPhysicsData {
    baseLevel: boolean;
    load: number;

    voxelPath: Voxel[];
    dependantVoxels: Voxel[];
}

export class VoxelPhysicsHelper {
    public static readonly MAX_LOAD = 5;

    public static getInitialVoxelPhysicsData(voxel: Voxel): VoxelPhysicsData {
        const raycastResult = !!game.Workspace.FindPartOnRayWithWhitelist(
            new Ray(voxel.position, new Vector3(0, -(Voxel.SIZE / 2 + 0.1), 0)),
            [ game.Workspace.FindFirstChild('Baseplate') as BasePart ]
        )[0];
        return {
            baseLevel: raycastResult,
            load: 0,
            voxelPath: [],
            dependantVoxels: []
        };
    }

    public static voxelRemoved(voxel: Voxel): void {
        Voxel.setVoxel(voxel.position, undefined);
        // Recalculate for all voxels that dependend on this voxel
        voxel.getNeighbors().forEach((neighbor) => {
            VoxelPhysicsHelper.calculateVoxelPhysics(neighbor);
        });
    }

    public static calculateVoxelPhysics(voxel: Voxel): void {
        if (voxel.isDestroyed()) return;

        const pData: VoxelPhysicsData = voxel.physicsData;
        if (pData.baseLevel) {
            pData.load = 0;
        }
        else {
            const voxelPathResult = VoxelPhysicsHelper.calculateVoxelPath(voxel);
            if (voxelPathResult) {
                const voxelPath = voxelPathResult[0];
                let pathSize = 0;

                let lastPathVoxel: Voxel | undefined = voxelPathResult[1];

                do {
                    lastPathVoxel.increaseLoad();
                    pathSize++;
                    lastPathVoxel = voxelPath.get(lastPathVoxel);
                } while (lastPathVoxel !== undefined && lastPathVoxel !== voxel);
                print(pathSize);
            }
            else {
                //TODO Optimize clearing all voxels that were not able to be held
                voxel.destroy();
            }
        }

        print('load', pData.load);
    }

    private static calculateVoxelPath(voxel: Voxel): [Map<Voxel, Voxel>, Voxel] | undefined {
        const frontier = new PriorityQueue<Voxel>();
        const cameFrom = new Map<Voxel, Voxel>();
        const costSoFar = new Map<Voxel, number>();

        frontier.insert(voxel, 0);
        costSoFar.set(voxel, 0);

        let destination: Voxel | undefined;

        while (frontier.size() > 0) {
            const current = frontier.pop();
            if (current === undefined || current.physicsData.baseLevel) {
                destination = current;
                break;
            }
            print(current.position.X, current.position.Y, current.position.Z, current.physicsData.baseLevel);
            const currentCost = costSoFar.get(current);
            current.getNeighbors().forEach((neighbor) => {
                const movementCost = 1; //current.position.sub(neighbor.position) === Voxel.UP ? 0 : 1; // neighbor.physicsData.load;
                const currentNeighborCost = costSoFar.get(neighbor);
                const newCost = movementCost + (currentCost !== undefined ? currentCost : 0);
                print(neighbor.position.X, neighbor.position.Y, neighbor.position.Z, currentNeighborCost, newCost);
                if (currentNeighborCost === undefined || newCost < currentNeighborCost) {
                    costSoFar.set(neighbor, newCost);
                    const priority = newCost + neighbor.position.Y;
                    print('inserted in frontier', priority);
                    frontier.insert(neighbor, priority);
                    cameFrom.set(neighbor, current);
                }
            });
        }
        if (destination) return [ cameFrom, destination ];
    }
}
