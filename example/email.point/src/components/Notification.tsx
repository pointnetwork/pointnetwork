import React, { ReactElement } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ExclamationIcon, BanIcon, CheckCircleIcon, XIcon } from '@heroicons/react/outline';
import { NotifactionStatuses } from '@store/modules/ui/constants';

import { selectors as uiSelectors, actions as uiActions } from '@store/modules/ui';
const Notification: React.FC<{}> = () => {
  const notification = useSelector(uiSelectors.getNotification);
  const dispatch = useDispatch();

  const statuses: Record<string, { icon: ReactElement; classes: string }> = {
    [NotifactionStatuses.SUCCESS]: {
      icon: <CheckCircleIcon className="w-6 h-6" />,
      classes: `
        bg-green-500
        border-green-600
        text-white-0
      `,
    },
    [NotifactionStatuses.ERROR]: {
      icon: <BanIcon className="w-6 h-6" />,
      classes: `
        bg-red-500
        border-red-600
        text-white-0
      `,
    },
    [NotifactionStatuses.WARNING]: {
      icon: <ExclamationIcon className="w-6 h-6" />,
      classes: `
        bg-yellow-500
        border-yellow-600
      `,
    },
  };

  function onCloseHandler() {
    dispatch(uiActions.hideNotification());
  }

  let icon = <ExclamationIcon />;
  let messageTypeClasses = '';

  if (notification) {
    const messageTypeOptions = statuses[notification.status];
    if (messageTypeOptions) {
      icon = messageTypeOptions.icon;
      messageTypeClasses = messageTypeOptions.classes;
    }
  }

  return (
    <>
      {notification ? (
        <div
          className={`
          relative
          bottom-0
          bg-transparent
        `}
        >
          <div
            className={
              `
              flex
              items-center
              mr-5
              ml-5
              justify-between
              p-4
              my-4
              text-sm
              text-white
              rounded-lg
              shadow-md
              focus:outline-none
              focus:shadow-outline-purple
            ` + messageTypeClasses
            }
          >
            {icon}
            <div className="flex flex-col flex-1 ml-2">
              {notification.title ? (
                <span className="text-lg font-semibold">{notification.title}</span>
              ) : (
                ''
              )}
              <span className="">{notification.message}</span>
            </div>
            <XIcon className="w-5 h-5 cursor-pointer" onClick={onCloseHandler} />
          </div>
        </div>
      ) : (
        ''
      )}
    </>
  );
};

export default Notification;
