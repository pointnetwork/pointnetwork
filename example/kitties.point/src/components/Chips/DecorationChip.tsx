import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHatWizard } from "@fortawesome/free-solid-svg-icons";
import { KittyChip } from "./KittyChip";
import { Tooltip } from "@material-ui/core";
import { getDecorationName } from "../../utils/getAttributeName";
import { CatConfig } from "../Cat/Cat";
import { shouldShowDecoration } from "../../utils/catLogic";

interface DecorationChipProps {
  kittyConfig: CatConfig;
}

export const DecorationChip = ({ kittyConfig }: DecorationChipProps) => {
  const { decoration } = kittyConfig;

  const decorationName = getDecorationName(decoration);

  if (!shouldShowDecoration(kittyConfig)) {
    return null;
  }

  const label = `With ${decorationName}`;

  return (
    <Tooltip title={`Decoration type: ${decorationName}`}>
      <KittyChip
        icon={<FontAwesomeIcon icon={faHatWizard} fixedWidth />}
        label={label}
      />
    </Tooltip>
  );
};
