type TodoItem = {
  id: number;
  owner: string;
  text: string;
  deleted: boolean;
  completed: boolean;
};

type WindowWithPoint = Window & {
  point: any;
};
