import React from "react";
import styled from "styled-components";
import { Chip, ChipProps } from "@material-ui/core";

const StyledChip = styled(Chip)`
  margin-right: 4px;
  margin-bottom: 4px;

  svg {
    font-size: 0.8em;
  }
  padding-left: 8px;
  padding-right: 8px;
`;

export const KittyChip = React.forwardRef((props: ChipProps, ref) => {
  return (
    <StyledChip color="secondary" size="small" {...props} innerRef={ref} />
  );
});
