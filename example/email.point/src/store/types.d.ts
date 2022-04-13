import { State as UiState } from './modules/ui/types';
import { State as IdentityState } from './modules/identity/types';

export type GlobalState = {
  ui: UiState;
  identity: IdentityState;
};
