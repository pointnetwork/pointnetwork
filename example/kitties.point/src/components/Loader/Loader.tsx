import React from "react";
import styled, { keyframes } from "styled-components";
import { secondaryColor } from "../../theme/theme";

// Source: https://tobiasahlin.com/spinkit/

const chase = keyframes`
    100% {
      transform: rotate(360deg);
    }
`;

const chaseDot = keyframes`
    80%,
    100% {
      transform: rotate(360deg);
    }
`;

const chaseDotBefore = keyframes`
    50% {
      transform: scale(0.4);
    }
    100%,
    0% {
      transform: scale(1);
    }
`;

const StyledLoader = styled.div<{ size?: number }>`
  width: ${(props) => (props.size ? `${props.size}px` : "1em")};
  height: ${(props) => (props.size ? `${props.size}px` : "1em")};
  position: relative;
  animation: ${chase} 2.5s infinite linear both;
  color: ${secondaryColor};
`;

const Dot = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  animation: ${chaseDot} 2s infinite ease-in-out both;

  &:before {
    content: "";
    display: block;
    width: 25%;
    height: 25%;
    background-color: currentColor;
    border-radius: 100%;
    animation: ${chaseDotBefore} 2s infinite ease-in-out both;
  }

  &:nth-child(1) {
    animation-delay: -1.1s;
  }
  &:nth-child(2) {
    animation-delay: -1s;
  }
  &:nth-child(3) {
    animation-delay: -0.9s;
  }
  &:nth-child(4) {
    animation-delay: -0.8s;
  }
  &:nth-child(5) {
    animation-delay: -0.7s;
  }
  &:nth-child(6) {
    animation-delay: -0.6s;
  }
  &:nth-child(1):before {
    animation-delay: -1.1s;
  }
  &:nth-child(2):before {
    animation-delay: -1s;
  }
  &:nth-child(3):before {
    animation-delay: -0.9s;
  }
  &:nth-child(4):before {
    animation-delay: -0.8s;
  }
  &:nth-child(5):before {
    animation-delay: -0.7s;
  }
  &:nth-child(6):before {
    animation-delay: -0.6s;
  }
`;

interface LoaderProps {
  size?: number;
}

export const Loader = ({ size }: LoaderProps) => {
  return (
    <StyledLoader size={size}>
      <Dot />
      <Dot />
      <Dot />
      <Dot />
      <Dot />
      <Dot />
    </StyledLoader>
  );
};
