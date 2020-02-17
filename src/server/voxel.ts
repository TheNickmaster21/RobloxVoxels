const voxelFolder = new Instance('Folder');
voxelFolder.Name = 'Voxels';
voxelFolder.Parent = game.Workspace;
voxelFolder.ChildRemoved.Connect((removedVoxel) => {
    if (removedVoxel.IsA('BasePart')) {
        const voxel = Voxel.getVoxel(removedVoxel.Position);
        if (voxel) {
            Voxel.setVoxel(voxel.position, undefined);
            voxel.getNeighbors().forEach((neighbor) => {
                if (neighbor) {
                    neighbor.calculateLoad();
                }
            });
        }
    }
});

const TweenService = game.GetService('TweenService');

export class Voxel {
    static readonly SIZE = 1;

    static readonly SIDE_STRENGTH = 2;

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

    public readonly part: Part;
    public readonly baseLevel: boolean;
    protected baseSupported: boolean;

    private load: number = 0;

    constructor(public readonly position: Vector3) {
        this.part = new Instance('Part');
        this.part.Name = 'Voxel';
        this.part.Anchored = true;
        this.part.Size = new Vector3(Voxel.SIZE, Voxel.SIZE, Voxel.SIZE);
        this.part.Position = position;
        this.part.Color = new Color3(110, 110, 110);
        this.part.Parent = voxelFolder;

        this.baseLevel = !!game.Workspace.FindPartOnRayWithWhitelist(
            new Ray(position, new Vector3(0, -(Voxel.SIZE / 2 + 0.1), 0)),
            [ game.Workspace.FindFirstChild('Baseplate') as BasePart ]
        )[0];
        this.baseSupported = this.baseLevel;
        this.calculateLoad();

        Voxel.setVoxel(position, this);
    }

    public getNeighbors(): Voxel[] {
        return Voxel.NEIGHBORS.mapFiltered((direction) => Voxel.getVoxel(this.position.add(direction)));
    }

    public calculateLoad(): number {
        if (this.baseLevel) {
            this.load = 0;
        }
        else {
            const downNeighbor = Voxel.getVoxel(this.position.add(Voxel.DOWN));
            if (downNeighbor && downNeighbor.baseSupported) {
                this.baseSupported = true;
                this.load = 0;
            }
            else {
                this.baseSupported = false;
                this.break();
                this.load = 1;
            }
        }

        print(this.load);

        return this.load;
    }

    public break(): void {
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
    }
}
