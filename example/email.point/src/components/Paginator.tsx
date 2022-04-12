import React from 'react';
import { ArrowCircleLeftIcon, ArrowCircleRightIcon } from '@heroicons/react/solid';

const Paginator: React.FC<{ disabled: boolean }> = () => {
  return (
    <div
      className="
      flex
      flex-row
      justify-end	
      text-xs
      px-4
      font-semibold
      tracking-wide
      text-gray-500
      bg-gray-50
      sm:grid-cols-9
      dark:text-gray-400
      dark:bg-gray-800
    "
    >
      <span className="flex col-span-4 mt-2 sm:mt-auto sm:justify-end">
        <nav aria-label="Table navigation">
          <ul className="inline-flex items-center">
            <li className="mr-2">
              <span className="flex items-center col-span-3">21-30 of 100</span>
            </li>
            <li>
              <button
                className="
                  p-1
                  rounded-md
                  rounded-l-lg
                  focus:outline-none
                  focus:shadow-outline-purple
                "
                aria-label="Previous"
              >
                <ArrowCircleLeftIcon className="w-6 h-6" />
              </button>
            </li>
            <li>
              <button
                className="
                  p-1
                  rounded-md
                  rounded-r-lg
                  focus:outline-none
                  focus:shadow-outline-purple
                "
                aria-label="Next"
              >
                <ArrowCircleRightIcon className="w-6 h-6" />
              </button>
            </li>
          </ul>
        </nav>
      </span>
    </div>
  );
};

export default Paginator;
