import { PriorityQueue } from 'shared/priority-queue';

const voxelFolder = new Instance('Folder');
voxelFolder.Name = 'Voxels';
voxelFolder.Parent = game.Workspace;
voxelFolder.ChildRemoved.Connect((removedVoxel) => {
    if (removedVoxel.IsA('BasePart')) {
        const voxel = Voxel.getVoxel(removedVoxel.Position);
        if (voxel && !voxel.isDestroyed()) {
            voxel.destroy();
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
        const voxel = this.voxels[x] ? (this.voxels[x][y] ? this.voxels[x][y][z] : undefined) : undefined;
        if (voxel && !voxel.isDestroyed()) {
            return voxel;
        }
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
        })();

        spawn(() => VoxelPhysicsHelper.voxelRemoved(this));
    }

    private setColor(color: Color3): void {
        if (this.part) {
            this.part.Color = color;
        }
    }

    public increaseLoad(): boolean {
        if (this.physicsData.baseLevel) return true;

        this.physicsData.load++;
        const ratio = this.physicsData.load / VoxelPhysicsHelper.MAX_LOAD;
        this.setColor(new Color3(ratio, 1 - ratio, 0));
        if (this.physicsData.load > VoxelPhysicsHelper.MAX_LOAD) {
            this.destroy();
            return false;
        }
        return true;
    }

    public decreaseLoad(): void {
        if (this.physicsData.baseLevel) return;

        this.physicsData.load--;
        const ratio = this.physicsData.load / VoxelPhysicsHelper.MAX_LOAD;
        this.setColor(new Color3(ratio, 1 - ratio, 0));
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
    public static SETUP_DONE = false;

    public static readonly MAX_LOAD = 10;

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
        voxel.physicsData.voxelPath.forEach((pathVoxel: Voxel) => {
            pathVoxel.decreaseLoad();
            const index = pathVoxel.physicsData.dependantVoxels.indexOf(voxel);
            pathVoxel.physicsData.dependantVoxels.splice(index, 1);
        });

        [ ...voxel.physicsData.dependantVoxels ].forEach((dependant) => {
            VoxelPhysicsHelper.calculateVoxelPhysics(dependant);
        });
    }

    public static calculateVoxelPhysics(voxel: Voxel): void {
        if (voxel.isDestroyed()) return;

        const pData: VoxelPhysicsData = voxel.physicsData;
        if (pData.baseLevel) {
            pData.load = 0;
        }
        else {
            pData.voxelPath.forEach((pathVoxel: Voxel) => {
                pathVoxel.decreaseLoad();
                const index = pathVoxel.physicsData.dependantVoxels.indexOf(voxel);
                if (index) pathVoxel.physicsData.dependantVoxels.splice(index, 1);
            });

            pData.voxelPath = [];
            const voxelPathResult = VoxelPhysicsHelper.calculateVoxelPath(voxel);
            if (voxelPathResult[0] === true) {
                const voxelPath: Map<Voxel, Voxel> = voxelPathResult[1];
                let lastPathVoxel: Voxel | undefined = voxelPathResult[2];

                const path: Voxel[] = [];
                while (lastPathVoxel !== undefined && lastPathVoxel !== voxel) {
                    path.push(lastPathVoxel);
                    lastPathVoxel = voxelPath.get(lastPathVoxel);
                }

                lastPathVoxel = undefined;
                for (let i = 0; i < path.size(); i++) {
                    const pathVoxel = path[i];
                    pathVoxel.physicsData.dependantVoxels.push(voxel);

                    if (!lastPathVoxel || !lastPathVoxel.position.sub(pathVoxel.position).FuzzyEq(Voxel.DOWN, 0)) {
                        pData.voxelPath.push(pathVoxel);
                        if (!pathVoxel.increaseLoad()) break;
                    }
                    lastPathVoxel = pathVoxel;
                }
            }
            else {
                voxelPathResult[1].forEach((exploredVoxel) => {
                    exploredVoxel.destroy();
                });
                voxel.destroy();
            }
        }
    }

    private static calculateVoxelPath(voxel: Voxel): [true, Map<Voxel, Voxel>, Voxel] | [false, Voxel[]] {
        const explored: Voxel[] = [];
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

            const currentCost = costSoFar.get(current);
            current.getNeighbors().forEach((neighbor) => {
                if (neighbor.physicsData.load >= VoxelPhysicsHelper.MAX_LOAD) return;
                const movementCost = current.position.sub(neighbor.position).FuzzyEq(Voxel.DOWN, 0) ? 0 : 1;
                const currentNeighborCost = costSoFar.get(neighbor);
                const newCost = movementCost + (currentCost !== undefined ? currentCost : 0);
                if (currentNeighborCost === undefined || newCost < currentNeighborCost) {
                    costSoFar.set(neighbor, newCost);
                    const priority = newCost + neighbor.position.Y + neighbor.physicsData.load;
                    frontier.insert(neighbor, priority);
                    if (!cameFrom.get(neighbor)) {
                        explored.push(neighbor);
                    }
                    cameFrom.set(neighbor, current);
                }
            });
        }
        if (destination) {
            return [ true, cameFrom, destination ];
        }
        else {
            return [ false, explored ];
        }
    }
}
