import React, { useState, useEffect } from "react";
import { Cat } from "../Cat/Cat";
import {
  Grid,
  Slider,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  CardHeader,
} from "@material-ui/core";
import { catConfig } from "../../config/catConfig";
import { getDnaFromConfig } from "../../utils/getDnaFromConfig";
import { useKittyCoreContract } from "../../hooks/useContract";
import { useFunction } from "../../hooks/useFunction";

export const CatFactory = () => {
  const kittyCore = useKittyCoreContract();
  const buyKitty = useFunction(kittyCore, "createGen0Kitty");

  const [mainColor, setMainColor] = useState(0);
  const [secondaryColor, setSecondaryColor] = useState(0);
  const [eyeColor, setEyeColor] = useState(0);
  const [patternColor, setPatternColor] = useState(0);

  const [pattern, setPattern] = useState(0);
  const [eyes, setEyes] = useState(0);
  const [mouth, setMouth] = useState(0);
  const [decoration, setDecoration] = useState(0);
  const [hidden1, setHidden1] = useState(0);
  const [hidden2, setHidden2] = useState(0);
  const [hidden3, setHidden3] = useState(0);
  const [bonus1, setBonus1] = useState(0);
  const [bonus2, setBonus2] = useState(0);

  useEffect(() => {
    handleRandomize();
  }, []);

  const handleRandomize = () => {
    setMainColor(
      Math.floor(
        Math.random() * catConfig.properties.mainColor.variations.length
      )
    );
    setSecondaryColor(
      Math.floor(
        Math.random() * catConfig.properties.secondaryColor.variations.length
      )
    );
    setEyeColor(
      Math.floor(
        Math.random() * catConfig.properties.eyeColor.variations.length
      )
    );
    setPatternColor(
      Math.floor(
        Math.random() * catConfig.properties.patternColor.variations.length
      )
    );

    setPattern(
      Math.floor(Math.random() * catConfig.properties.pattern.variations.length)
    );
    setEyes(
      Math.floor(Math.random() * catConfig.properties.eyes.variations.length)
    );
    setMouth(
      Math.floor(Math.random() * catConfig.properties.mouth.variations.length)
    );
    setDecoration(
      Math.floor(
        Math.random() * catConfig.properties.decoration.variations.length
      )
    );
    setHidden1(
      Math.floor(Math.random() * catConfig.properties.hidden1.variations.length)
    );
    setHidden2(
      Math.floor(Math.random() * catConfig.properties.hidden2.variations.length)
    );
    setHidden3(
      Math.floor(Math.random() * catConfig.properties.hidden3.variations.length)
    );
    setBonus1(
      Math.floor(Math.random() * catConfig.properties.bonus1.variations.length)
    );
    setBonus2(
      Math.floor(Math.random() * catConfig.properties.bonus2.variations.length)
    );
  };

  const newCatConfig = {
    mainColor,
    secondaryColor,
    eyeColor,
    patternColor,
    pattern,
    eyes,
    mouth,
    decoration,
    hidden1,
    hidden2,
    hidden3,
    bonus1,
    bonus2,
  };
  const catDna = getDnaFromConfig(newCatConfig);

  const handleCreate = async () => {
    buyKitty.call({
      args: [catDna],
      afterResponse: handleRandomize,
    });
  };

  return (
    <Grid container>
      <Grid item container xs justify="center" alignItems="center">
        <Cat config={newCatConfig} maxWidth={400} />
      </Grid>
      <Grid item xs>
        <Card>
          <CardHeader title="Create a new kitty" subheader={`dna: ${catDna}`} />
          <CardContent>
            <Grid container spacing={4}>
              <Grid item xs>
                <Typography gutterBottom>Main color</Typography>
                <Slider
                  value={mainColor}
                  onChange={(event, value) => setMainColor(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.mainColor.variations.length - 1}
                />
                <Typography gutterBottom>Secondary color</Typography>
                <Slider
                  value={secondaryColor}
                  onChange={(event, value) =>
                    setSecondaryColor(value as number)
                  }
                  step={1}
                  min={0}
                  max={
                    catConfig.properties.secondaryColor.variations.length - 1
                  }
                />
                <Typography gutterBottom>Eye color</Typography>
                <Slider
                  value={eyeColor}
                  onChange={(event, value) => setEyeColor(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.eyeColor.variations.length - 1}
                />
                <Typography gutterBottom>Pattern color</Typography>
                <Slider
                  value={patternColor}
                  onChange={(event, value) => setPatternColor(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.patternColor.variations.length - 1}
                />
              </Grid>
              <Grid item xs>
                <Typography gutterBottom>Pattern</Typography>
                <Slider
                  value={pattern}
                  onChange={(event, value) => setPattern(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.pattern.variations.length - 1}
                />
                <Typography gutterBottom>Eyes</Typography>
                <Slider
                  value={eyes}
                  onChange={(event, value) => setEyes(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.eyes.variations.length - 1}
                />
                <Typography gutterBottom>Mouth</Typography>
                <Slider
                  value={mouth}
                  onChange={(event, value) => setMouth(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.mouth.variations.length - 1}
                />
                <Typography gutterBottom>Decoration</Typography>
                <Slider
                  value={decoration}
                  onChange={(event, value) => setDecoration(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.decoration.variations.length - 1}
                />
                <Typography gutterBottom>Hidden1</Typography>
                <Slider
                  value={hidden1}
                  onChange={(event, value) => setHidden1(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.hidden1.variations.length - 1}
                />
                <Typography gutterBottom>Hidden2</Typography>
                <Slider
                  value={hidden2}
                  onChange={(event, value) => setHidden2(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.hidden2.variations.length - 1}
                />
                <Typography gutterBottom>Hidden3</Typography>
                <Slider
                  value={hidden3}
                  onChange={(event, value) => setHidden3(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.hidden3.variations.length - 1}
                />
                <Typography gutterBottom>Bonus 1</Typography>
                <Slider
                  value={bonus1}
                  onChange={(event, value) => setBonus1(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.bonus1.variations.length - 1}
                />
                <Typography gutterBottom>Bonus 2</Typography>
                <Slider
                  value={bonus2}
                  onChange={(event, value) => setBonus2(value as number)}
                  step={1}
                  min={0}
                  max={catConfig.properties.bonus2.variations.length - 1}
                />
              </Grid>
            </Grid>
          </CardContent>

          <CardActions>
            <Button onClick={handleRandomize}>Randomize</Button>
            <Button onClick={handleCreate} color="primary" variant="contained">
              Add kitty
            </Button>
          </CardActions>
        </Card>
      </Grid>
    </Grid>
  );
};
