import React, { useRef, useEffect } from "react";
import styled from "styled-components";
// @ts-ignore
import Jazzicon from "@metamask/jazzicon";

const StyledIdenticon = styled.div<{ size: number }>`
  height: ${(props) => props.size}px;
  width: ${(props) => props.size}px;
  border-radius: 1.125rem;
`;

interface IdenticonProps {
  account: string;
  size?: number;
}

export const Identicon = ({ account, size = 20 }: IdenticonProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (account && element) {
      element.innerHTML = "";
      element.appendChild(Jazzicon(size, parseInt(account.slice(2, 10), 16)));
    }
  }, [account, size]);

  return <StyledIdenticon ref={ref} size={size} />;
};
