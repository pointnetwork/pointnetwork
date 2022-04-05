import React from "react";
import { Route, RouteProps } from "react-router-dom";
import { Error401 } from "../../pages/Error401";

interface ProtectedRouteProps extends RouteProps {
  isAllowed: boolean;
  children?: React.ReactNode;
}

export const ProtectedRoute = ({
  isAllowed,
  children,
  ...routeProps
}: ProtectedRouteProps) => {
  if (!isAllowed) {
    return <Error401 />;
  }

  return <Route {...routeProps}>{children}</Route>;
};
