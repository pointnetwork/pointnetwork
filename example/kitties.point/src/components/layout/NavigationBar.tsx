import React from "react";
import { AppBar, Toolbar, Link } from "@material-ui/core";
import { ConnectButton } from "../ConnectWalletButton/ConnectWalletButton";
import { ReactComponent as Logo } from "../../assets/svg/logo.svg";
import { Link as RouterLink } from "react-router-dom";
import styled from "styled-components";
import { Route } from "../../routes";

const StyledNav = styled.nav`
  color: white;
  display: flex;
`;

const Brand = styled.span`
  flex-grow: 1;
  font-size: 2.3rem;
  line-height: 1;
  color: white;
`;

const Buttons = styled.div`
  & > * {
    margin: 4px;
  }
`;

const StyledLink = styled(Link)<any>`
  margin-right: 1.5em;
`;

interface NavigationBarProps {
  menuItems: Route[];
}

export const NavigationBar = ({ menuItems }: NavigationBarProps) => {
  return (
    <AppBar position="static" color="secondary" elevation={1}>
      <Toolbar>
        <Brand>
          <Link component={RouterLink} to="/" color="inherit">
            <Logo />
          </Link>
        </Brand>
        <StyledNav>
          {menuItems.map((menuItem) => (
            <NavigationMenuItem key={menuItem.to} {...menuItem} />
          ))}
        </StyledNav>

        <Buttons>
          <ConnectButton />
        </Buttons>
      </Toolbar>
    </AppBar>
  );
};

const NavigationMenuItem = ({ isAllowed, navigationLabel, to }: Route) => {
  if (!isAllowed || !navigationLabel) {
    return null;
  }

  return (
    <StyledLink variant="button" color="inherit" component={RouterLink} to={to}>
      {navigationLabel}
    </StyledLink>
  );
};
