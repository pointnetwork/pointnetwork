import React, { useState } from 'react';
import { CheckCircleIcon, MinusCircleIcon } from '@heroicons/react/solid';
import Spinner from '@components/Spinner';

const windowWithEthereum = window as unknown as WindowWithPoint;
const TodoItem: React.FC<{ item: TodoItem; refreshTodoList: Function }> = (props) => {
  const [completing, setCompleting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const { item, refreshTodoList } = props;

  async function completeTodo() {
    if (completing) {
      return;
    }
    setCompleting(true);
    await windowWithEthereum.point.contract.send({
      contract: 'Todo',
      method: 'completeTask',
      params: [item.id, !item.completed],
    });
    await refreshTodoList();
    setCompleting(false);
  }

  async function deleteTodo() {
    if (deleting) {
      return;
    }
    setDeleting(true);
    await windowWithEthereum.point.contract.send({
      contract: 'Todo',
      method: 'deleteTask',
      params: [item.id, !item.deleted],
    });
    await refreshTodoList();
    setDeleting(false);
  }

  return (
    <div className="flex my-2 items-center border-b-1 border-gray-400">
      <button
        onClick={completeTodo}
        className={`
          p-2
          text-green-600
          hover:text-green-500 
          disabled:cursor-not-allowed
          disabled:text-green-600
          text-sm
        `}
        disabled={completing}
      >
        {completing ? <Spinner className="h-6 w-6" /> : <CheckCircleIcon className="h-6 w-6" />}
      </button>
      <p
        className={`
        w-full
        text-gray-600
        ${item.completed ? 'line-through' : ''}
      `}
      >
        {item.text}
      </p>
      <button
        onClick={deleteTodo}
        className={`
          bg-gray-50
          flex
          flex-row
          items-center
          py-2
          px-3
          border-2 
          mx-1
          rounded 
          text-red-600 
          border-red-600 
          hover:text-white 
          hover:bg-red-600
          disabled:cursor-not-allowed
          disabled:text-red-600
          disabled:bg-gray-50
          disabled:border-red-600
          text-sm
        `}
        disabled={deleting}
      >
        {deleting ? (
          <>
            <Spinner />
            <span className="ml-2">Removing...</span>
          </>
        ) : (
          <>
            <MinusCircleIcon className="h-5 w-5 mr-2" />
            <span>Remove</span>
          </>
        )}
      </button>
    </div>
  );
};

export default TodoItem;
