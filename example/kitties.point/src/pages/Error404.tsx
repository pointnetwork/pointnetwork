import React from "react";
import { Typography, Grid } from "@material-ui/core";
import { Cat } from "../components/Cat/Cat";
import { CatPreset } from "../config/presetCats";

export const Error404 = () => {
  return (
    <Grid container justify="center" alignItems="center" spacing={10}>
      <Grid item xs={12} sm={6}>
        <Cat dna={CatPreset.ErrorCat} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography variant="h2" component="h1" gutterBottom align="center">
          404 - Page not found
        </Typography>
        <Typography variant="subtitle1" align="center">
          Oops, this page does not exist (anymore).
        </Typography>
      </Grid>
    </Grid>
  );
};
