import { GlobalState } from '../../types';

export const getNotification = (state: GlobalState) => state.ui.notification;
