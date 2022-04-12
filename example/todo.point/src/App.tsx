import React, { useState, useEffect } from 'react';
import AddTodoForm from '@components/AddTodoForm';
import TodoItem from '@components/TodoItem';
import Spinner from '@components/Spinner';

const windowWithEthereum = window as unknown as WindowWithPoint;

export default function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);

  async function refreshTodoList() {
    setLoading(true);
    const { data } = await windowWithEthereum.point.contract.call({
      contract: 'Todo',
      method: 'getTasks',
    });

    const todos: TodoItem[] = [];
    data.forEach(
      ([id, owner, text, deleted, completed]: [number, string, string, boolean, boolean]) => {
        if (deleted) {
          return;
        }
        todos.push({
          id,
          owner,
          text,
          deleted,
          completed,
        });
      }
    );

    setTodoItems(todos.sort(({ id: id1 }, { id: id2 }) => id2 - id1));
    setLoading(false);
  }

  useEffect(() => {
    refreshTodoList().catch((error) => {
      console.error(error);
    });
  }, []);

  return (
    <div className="bg-white rounded shadow p-5 mt-5">
      <div className="mb-4">
        <h1 className="text-gray-600 text-lg">Todo List</h1>
        <AddTodoForm refreshTodoList={refreshTodoList} />
      </div>
      <div className="flex flex-col w-full mt-5">
        {todoItems.length
          ? todoItems.map((todoItem) => (
              <TodoItem item={todoItem} key={todoItem.id} refreshTodoList={refreshTodoList} />
            ))
          : ''}
        {!todoItems.length && !loading ? (
          <div className="text-gray-500 text-sm">The list is empty.</div>
        ) : (
          ''
        )}
      </div>
      {loading && (
        <div className="flex items-center text-sm mt-2">
          <Spinner className="mr-2" />
          <span className="text-gray-600">Refreshing list...</span>
        </div>
      )}
    </div>
  );
}
