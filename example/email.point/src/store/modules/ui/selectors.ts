import { GlobalState } from '../../types';

export const getNotification = (state: GlobalState) => state.ui.notification;
export const getLoading = (state: GlobalState) => state.ui.loading;
