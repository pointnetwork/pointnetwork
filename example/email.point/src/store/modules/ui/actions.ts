import { Dispatch } from 'redux';
import { NotifactionStatuses } from './constants';
import { uiActions } from './slice';

export const syncActions = uiActions;

import { Notification, NotificationProps, NotificationWithoutStatus } from './types';

export const showNotificationFactory = (status: NotifactionStatuses) => {
  return (notification: NotificationWithoutStatus, props?: NotificationProps) => {
    return (dispatch: Dispatch) => {
      const { title, message = '' } = notification;
      const { delay = 0, timeout = 1000 * 2 } = props || {};
      setTimeout(() => {
        dispatch(
          uiActions.showNotification({
            title,
            message,
            status,
          })
        );
      }, delay);

      if (timeout) {
        const hideNotificationTime = delay + timeout;
        setTimeout(() => {
          dispatch(uiActions.hideNotification());
        }, hideNotificationTime);
      }
    };
  };
};

export const showNotification = (notification: Notification, props?: NotificationProps) => {
  return showNotificationFactory(notification.status)(notification, props);
};

export const showSuccessNotification = (
  notification: NotificationWithoutStatus,
  props?: NotificationProps
) => {
  return showNotificationFactory(NotifactionStatuses.SUCCESS)(notification, props);
};

export const showErrorNotification = (
  notification: NotificationWithoutStatus,
  props?: NotificationProps
) => {
  return showNotificationFactory(NotifactionStatuses.ERROR)(notification, props);
};

export const showWarningNotification = (
  notification: NotificationWithoutStatus,
  props?: NotificationProps
) => {
  return showNotificationFactory(NotifactionStatuses.WARNING)(notification, props);
};

export const showInfoNotification = (
  notification: NotificationWithoutStatus,
  props?: NotificationProps
) => {
  return showNotificationFactory(NotifactionStatuses.WARNING)(notification, props);
};

export const showNotificationWithDelay = (notification: Notification, delay: number) => {
  return async (dispatch: Dispatch) => {
    setTimeout(() => {
      dispatch(uiActions.showNotification(notification));
    }, delay);
  };
};

export const hideNotification = () => {
  return (dispatch: Dispatch) => {
    dispatch(uiActions.hideNotification());
  };
};
