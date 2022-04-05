import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDna, faPalette } from "@fortawesome/free-solid-svg-icons";
import { KittyChip } from "./KittyChip";
import { Tooltip } from "@material-ui/core";
import { catConfig } from "../../config/catConfig";
import { getColorName } from "../../utils/getAttributeName";

interface SecondaryColorChipProps {
  colorIndex: number;
}

export const SecondaryColorChip = ({ colorIndex }: SecondaryColorChipProps) => {
  const colorHex = catConfig.properties.secondaryColor.variations[colorIndex];
  const colorName = getColorName(colorHex);

  return (
    <Tooltip title={`Secondary color: ${colorName}`}>
      <KittyChip
        icon={<FontAwesomeIcon icon={faPalette} fixedWidth />}
        label={colorName}
      />
    </Tooltip>
  );
};
