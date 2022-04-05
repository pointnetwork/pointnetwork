import React from "react";
import { Cat } from "../components/Cat/Cat";
import { CatPreset } from "../config/presetCats";
import { Box, Typography, Link } from "@material-ui/core";

export const Home = () => {
  return (
    <div>
      <Typography variant="h1" align="center">
        Crypto Kitties
      </Typography>
      <Typography variant="h4" align="center" color="secondary" gutterBottom>
        Buy. Breed. Addore. Sell
      </Typography>

      <Typography variant="subtitle1" align="center">
        An{" "}
        <Link href="http://ivanontech.com" target="_blank" rel="noopener">
          Ivan on Tech Academy
        </Link>{" "}
        project, made by{" "}
        <Link href="https://github.com/ErnoW/" target="_blank" rel="noopener">
          Erno Wever
        </Link>
      </Typography>
      <Box mx="auto" maxWidth={640} my={7}>
        <Typography align="center">
          In CryptoKitties, users collect and breed oh-so-adorable creatures
          that we call CryptoKitties! Each kitty has a unique genome that
          defines its appearance and traits. Players can breed their kitties to
          create new furry friends and unlock rare cattributes. CryptoKitties is
          one of the world’s first blockchain games. ‘Blockchain’ is the
          technology that makes things like Bitcoin possible. While
          CryptoKitties isn’t a digital currency, it does offer the same
          security: each CryptoKitty is one-of-a-kind and 100% owned by you. It
          cannot be replicated, taken away, or destroyed.
        </Typography>

        <Box display="flex" mt={6}>
          <Cat dna={CatPreset.CuteCat} />
          <Cat dna={CatPreset.CoolCat} />
          <Cat dna={CatPreset.FancyCat} />
          <Cat dna={CatPreset.SpaceCat} />
          <Cat dna={CatPreset.GirlyCat} />
          <Cat dna={CatPreset.WeirdCat} />
        </Box>
      </Box>
    </div>
  );
};
