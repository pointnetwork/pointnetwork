import React, { ReactElement } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

import {
  InboxInIcon as InboxInIconSolid,
  MailIcon,
  ExclamationCircleIcon,
  PencilAltIcon,
  TrashIcon,
} from '@heroicons/react/solid';

import { selectors as identitySelectors } from '@store/modules/identity';

type Item = {
  title: string;
  icon?: ReactElement;
  url: string;
};

const Item: React.FC<{ item: Item }> = (props) => {
  const { item } = props;
  return (
    <li className="relative px-6 py-3">
      <NavLink
        className="
          inline-flex
          items-center
          w-full
          text-sm
          font-semibold
          transition-colors
          duration-150
          text-gray-500
          hover:text-gray-800
          dark:text-gray-400
          dark:hover:text-gray-200
        "
        to={item.url}
      >
        <div className="w-5 h-5">{item.icon}</div>
        <span className="ml-4">{item.title}</span>
      </NavLink>
    </li>
  );
};

const ComposeButton: React.FC<{}> = () => {
  return (
    <Link
      to="/compose"
      className="
    w-full
    flex
    flex-row
    rounded
    items-center
    border-2
    border-orange-600
    bg-orange-500
    text-white
    justify-center
    p-2
  "
    >
      <PencilAltIcon className="w-5 h-5 mr-2" />
      <span>Compose</span>
    </Link>
  );
};

const Sidebar: React.FC<{ isOpen: boolean; openSidebar: Function }> = (props) => {
  const { isOpen, openSidebar } = props;

  const menus = [
    { title: 'Inbox', icon: <InboxInIconSolid />, url: '/' },
    // { title: 'Sent', icon: <MailIcon />, url: '/sent' },
    // { title: 'Important', icon: <ExclamationCircleIcon />, url: '/important' },
    // { title: 'Drafts 30', icon: <PencilAltIcon />, url: '/drafts' },
    // { title: 'Trash', icon: <TrashIcon />, url: '/trash' },
  ];

  const identity = useSelector(identitySelectors.getIdentity);

  return (
    <>
      <aside className="z-20 hidden w-64 overflow-y-auto bg-white dark:bg-gray-800 md:block flex-shrink-0">
        <div className="py-4 text-gray-500 dark:text-gray-400">
          <Link className="ml-6 block text-gray-800 dark:text-gray-200" to="/">
            <div className="text-lg font-bold">Email</div>
            <div className="text-md">Full Name: {identity}</div>
          </Link>
          <div className="py-6 px-4 mt-5">
            <ComposeButton />
          </div>
          <ul>
            {menus.map((item) => (
              <Item item={item} key={item.url} />
            ))}
          </ul>
        </div>
      </aside>

      <div
        className={`
          ${!isOpen ? 'hidden' : ''}
          fixed
          inset-0
          z-10
          flex
          items-end
          bg-black
          bg-opacity-50
          sm:items-center
          sm:justify-center
        `}
      ></div>

      <aside
        className={`
          ${!isOpen ? 'hidden' : ''}
          fixed
          inset-y-0
          z-20
          flex-shrink-0
          w-64
          mt-16
          overflow-y-auto
          bg-white
          dark:bg-gray-800 md:hidden
        `}
        onClick={() => openSidebar(false)}
        onKeyDown={() => openSidebar(false)}
      >
        <div className="py-4 text-gray-500 dark:text-gray-400">
          <a className="ml-6 text-lg font-bold text-gray-800 dark:text-gray-200" href="#">
            Menu
          </a>
          <div className="py-2 px-4 mt-5">
            <ComposeButton />
          </div>
          <ul className="">
            {menus.map((item) => (
              <Item item={item} key={item.url} />
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
