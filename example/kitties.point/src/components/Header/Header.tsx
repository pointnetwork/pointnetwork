import React from "react";
import { Typography } from "@material-ui/core";

interface HeaderProps {
  title: string;
  subTitle?: string;
}

export const Header = ({ title, subTitle }: HeaderProps) => {
  return (
    <>
      <Typography variant="h2" component="h1" gutterBottom align="center">
        {title}
      </Typography>
      {subTitle && (
        <Typography variant="subtitle1" gutterBottom align="center">
          {subTitle}
        </Typography>
      )}
    </>
  );
};
