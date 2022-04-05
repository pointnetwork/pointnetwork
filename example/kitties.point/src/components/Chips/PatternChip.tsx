import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSplotch } from "@fortawesome/free-solid-svg-icons";
import { KittyChip } from "./KittyChip";
import { Tooltip } from "@material-ui/core";
import { catConfig } from "../../config/catConfig";
import { getColorName, getPatternName } from "../../utils/getAttributeName";
import { CatConfig } from "../Cat/Cat";
import { shouldShowPattern } from "../../utils/catLogic";

interface PatternChipProps {
  kittyConfig: CatConfig;
}

export const PatternChip = ({ kittyConfig }: PatternChipProps) => {
  const { patternColor, pattern } = kittyConfig;

  const colorHex = catConfig.properties.mainColor.variations[patternColor];
  const colorName = getColorName(colorHex);
  const patternName = getPatternName(pattern);

  if (!shouldShowPattern(kittyConfig)) {
    return null;
  }

  const label = `${colorName} ${patternName} Pattern`;

  return (
    <Tooltip title={`Pattern type: ${patternName}. Color: ${colorName}`}>
      <KittyChip
        icon={<FontAwesomeIcon icon={faSplotch} fixedWidth />}
        label={label}
      />
    </Tooltip>
  );
};
