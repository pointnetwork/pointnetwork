import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Spinner from '@components/Spinner';

const RedirectWithTimeout: React.FC<{
  to: string;
  timeout?: number;
  message?: string;
}> = (props) => {
  const [redirect, setRedirect] = useState<boolean>(false);
  const { to, timeout = 1000 * 5, message = 'Redirecting' } = props;

  useEffect(() => {
    const t = setTimeout(() => {
      setRedirect(true);
    }, timeout);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      {redirect ? (
        <div className="container">
          <Navigate to={to} />
          <Spinner className="w-8 h-8" />
          <p className="font-bold">{message}</p>
        </div>
      ) : (
        <>{props.children}</>
      )}
    </>
  );
};

export default RedirectWithTimeout;
