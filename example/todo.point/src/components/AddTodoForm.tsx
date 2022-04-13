import React, { useState } from 'react';
import { PlusCircleIcon } from '@heroicons/react/solid';
import Spinner from '@components/Spinner';

const windowWithPoint = window as unknown as WindowWithPoint;

const AddTodoForm: React.FC<{ refreshTodoList: Function }> = (props) => {
  const { refreshTodoList } = props;
  const [loading, setLoading] = useState<boolean>(false);
  const [todoText, setTodoText] = useState<string>('');

  const addTodo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || !todoText) {
      return;
    }

    setLoading(true);
    const response = await windowWithPoint.point.contract.send({
      contract: 'Todo',
      method: 'addTask',
      params: [todoText, false, false],
    });

    console.log(response);
    setLoading(false);
    setTodoText('');
    await refreshTodoList();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTodoText(event.target.value);
  };

  return (
    <form className="flex flex-row mt-4" onSubmit={addTodo}>
      <input
        value={todoText}
        className="
          shadow 
          appearance-none
          border
          rounded 
          w-full 
          py-2 
          px-3 
          mr-4 
          text-gray-600
          disabled:cursor-not-allowed
        "
        placeholder="...Make a sandwitch"
        disabled={!!loading}
        onChange={handleChange}
      />
      <button
        type="submit"
        disabled={!!loading || !todoText}
        className={`
          flex
          flex-row
          items-center
          py-2
          ${loading ? 'px-3' : 'px-6'}
          border-2
          rounded
          pointer
          text-teal-600
          border-teal-600
          hover:text-gray-100
          hover:bg-teal-600
          disabled:cursor-not-allowed
          disabled:text-gray-100
          disabled:bg-gray-400
          disabled:border-0
          text-sm
        `}
      >
        {loading ? (
          <>
            <Spinner />
            <span className="ml-2">Adding...</span>
          </>
        ) : (
          <>
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            <span>Add</span>
          </>
        )}
      </button>
    </form>
  );
};

export default AddTodoForm;
