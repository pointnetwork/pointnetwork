import React from "react";
import { Typography, Grid } from "@material-ui/core";
import { Cat } from "../components/Cat/Cat";
import { CatPreset } from "../config/presetCats";

export const Error401 = () => {
  return (
    <Grid container justify="center" alignItems="center" spacing={10}>
      <Grid item xs={12} sm={6}>
        <Cat dna={CatPreset.UnAuthorizedCat} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography variant="h2" component="h1" gutterBottom align="center">
          401 - Unauthorized
        </Typography>
        <Typography variant="subtitle1" align="center">
          You are not allowed to enter this page.
        </Typography>
      </Grid>
    </Grid>
  );
};
