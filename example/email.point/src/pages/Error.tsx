import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import RedirectWithTimeout from '@components/RedirectWithTimeout';

import { actions as uiActions } from '@store/modules/ui';

const Error: React.FC<{}> = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      uiActions.showErrorNotification({
        message: `Invalid path.`,
      })
    );
  }, []);

  return (
    <RedirectWithTimeout to="/" timeout={2000}>
      <main style={{ padding: '1rem' }}>
        <p>There's nothing here!</p>
      </main>
    </RedirectWithTimeout>
  );
};

export default Error;
