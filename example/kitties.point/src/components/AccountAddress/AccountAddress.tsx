import React from "react";
import { shortAddress } from "../../utils/address";
import { Identicon } from "../Identicon/Identicon";
import styled from "styled-components";

const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  font-size: 1.1;
  vertical-align: middle;
  margin-right: 8px;
  margin-left: 8px;
`;

const Address = styled.span`
  margin-left: 8px;
`;

interface AccountAddressProps {
  children: string;
  iconSize?: number;
  fullAddress?: boolean;
}

export const AccountAddress = ({
  children,
  iconSize,
  fullAddress = false,
}: AccountAddressProps) => {
  return (
    <Wrapper>
      <Identicon account={children} size={iconSize} />
      <Address>{fullAddress ? children : shortAddress(children)}</Address>
    </Wrapper>
  );
};
