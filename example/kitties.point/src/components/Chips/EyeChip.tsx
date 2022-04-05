import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";
import { KittyChip } from "./KittyChip";
import { Tooltip } from "@material-ui/core";
import { catConfig } from "../../config/catConfig";
import { getColorName, getEyeName } from "../../utils/getAttributeName";
import { CatConfig } from "../Cat/Cat";

interface EyeChipProps {
  kittyConfig: CatConfig;
}

export const EyeChip = ({ kittyConfig }: EyeChipProps) => {
  const { eyeColor, eyes } = kittyConfig;

  const colorHex = catConfig.properties.eyeColor.variations[eyeColor];
  const colorName = getColorName(colorHex);
  const eyeName = getEyeName(eyes);

  let label: string;
  if ([4, 6, 7].includes(eyes)) {
    label = `${eyeName} Eyes`;
  } else {
    label = `${colorName} ${eyeName} Eyes`;
  }

  return (
    <Tooltip title={`Eyes type: ${eyeName}. Color: ${colorName}`}>
      <KittyChip
        icon={<FontAwesomeIcon icon={faEye} fixedWidth />}
        label={label}
      />
    </Tooltip>
  );
};
