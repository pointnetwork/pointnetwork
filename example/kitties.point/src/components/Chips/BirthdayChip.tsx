import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBabyCarriage } from "@fortawesome/free-solid-svg-icons";
import { DateTime } from "luxon";
import { KittyChip } from "./KittyChip";
import { Tooltip } from "@material-ui/core";

interface BirthdayChipProps {
  // Birthtime in unix time
  birthTime: number;
}

export const BirthdayChip = ({ birthTime }: BirthdayChipProps) => {
  const relativeBornDate = DateTime.fromSeconds(birthTime).toRelative({});
  const dateFormatted = DateTime.fromSeconds(birthTime).toLocaleString({
    weekday: "long",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Tooltip title={`Birthday: ${dateFormatted}`}>
      <KittyChip
        icon={<FontAwesomeIcon icon={faBabyCarriage} fixedWidth />}
        label={relativeBornDate}
      />
    </Tooltip>
  );
};
