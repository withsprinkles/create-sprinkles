export interface FileTree {
    [key: string]: string | Buffer | FileTree;
}

export interface Script {
    commands: string[];
    phase: number;
    silent?: boolean;
}

export interface Creation {
    files: FileTree;
    scripts: Script[];
    suggestions: string[];
}
