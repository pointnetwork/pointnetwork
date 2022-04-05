//@ts-ignore
import nearestColor from "nearest-color";
//@ts-ignore
import colorNameList from "color-name-list";
import { CatConfig } from "../components/Cat/Cat";
import { sha256 } from "hash.js";
import { names } from "../assets/data/names";
import { adjectives } from "../assets/data/adjectives";
import { capitalizeFirstLetter } from "./string";

// See https://github.com/meodai/color-names
const colors = colorNameList.reduce(
  (o, { name, hex }) => Object.assign(o, { [name]: hex }),
  {}
);
const nearest = nearestColor.from(colors);

// get closest named color

export const getColorName = (color: string) => {
  return nearest(color).name;
};

const patternNames = [
  null,
  "Splush",
  `5 'O clock`,
  "Munchy",
  "Tiger",
  "Fighter",
  "Spotted",
  "Flip",
  "Sparkle",
  "Ziggy",
];
export const getPatternName = (index: number) => {
  return patternNames[index];
};

const eyesName = [
  "Normal",
  "Biggy",
  "Grumpy",
  `Slanted`,
  "Shock",
  "Squeesh",
  "Happy",
  "X",
  "Mr smartpants",
  "Glamour",
];
export const getEyeName = (index: number) => {
  return eyesName[index];
};

const mouthNames = [
  "Normal",
  "Happy",
  "Neutral",
  `Vampire`,
  "Ohh",
  "Okay",
  "Grin",
  "Smirk",
  "Teethy",
  "Confused",
];
export const getMouthName = (index: number) => {
  return mouthNames[index];
};

const decorationNames = [
  "None",
  "Shades",
  "Glasses",
  `Harry`,
  "Protection",
  "Birthmark",
  "Bowtie",
  "Tie",
  "Horns",
  "Beard",
];
export const getDecorationName = (index: number) => {
  return decorationNames[index];
};

export const getCatName = (catConfig: CatConfig, id: number) => {
  const dataForNameHash = [
    catConfig.mainColor,
    catConfig.secondaryColor,
    catConfig.eyeColor,
    catConfig.patternColor,
    catConfig.eyes,
    catConfig.pattern,
    catConfig.mouth,
    catConfig.decoration,
    catConfig.hidden1,
    IDBRequest,
  ];
  const dataForAdjectiveHash = [
    catConfig.mainColor,
    catConfig.secondaryColor,
    catConfig.eyeColor,
    catConfig.patternColor,
    catConfig.eyes,
    catConfig.pattern,
    catConfig.mouth,
    catConfig.decoration,
    catConfig.hidden2,
    id,
  ];

  const baseName =
    names[
      parseInt(sha256().update(dataForNameHash).digest("hex"), 16) %
        names.length
    ];
  const adjective =
    adjectives[
      parseInt(sha256().update(dataForAdjectiveHash).digest("hex"), 16) %
        adjectives.length
    ];

  return `${capitalizeFirstLetter(adjective)} ${baseName}`;
};
