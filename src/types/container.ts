export interface ContainerPort {
  internal: number;
  external: number;
}

export interface Container {
  id: string;
  name: string;
  status: string;
  ports: ContainerPort[];
}
