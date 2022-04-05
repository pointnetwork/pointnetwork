import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette } from "@fortawesome/free-solid-svg-icons";
import { KittyChip } from "./KittyChip";
import { Tooltip } from "@material-ui/core";
import { catConfig } from "../../config/catConfig";
import { getColorName } from "../../utils/getAttributeName";
import { CatConfig } from "../Cat/Cat";

interface ColorChipProps {
  kittyConfig: CatConfig;
}

export const ColorChip = ({ kittyConfig }: ColorChipProps) => {
  const { mainColor: color1, secondaryColor: color2 } = kittyConfig;

  const color1Hex = catConfig.properties.mainColor.variations[color1];
  const color2Hex = catConfig.properties.secondaryColor.variations[color2];
  const color1Name = getColorName(color1Hex);
  const color2Name = getColorName(color2Hex);

  const label =
    color1Name === color2Name ? color1Name : `${color1Name} ${color2Name}`;
  return (
    <Tooltip
      title={`Primary color: ${color1Name}. Secondary color: ${color2Name} `}
    >
      <KittyChip
        icon={<FontAwesomeIcon icon={faPalette} fixedWidth />}
        label={label}
      />
    </Tooltip>
  );
};
