import { ReactComponent as PatternA } from "../assets/svg/patternA.svg";
import { ReactComponent as PatternB } from "../assets/svg/patternB.svg";
import { ReactComponent as PatternC } from "../assets/svg/patternC.svg";
import { ReactComponent as PatternD } from "../assets/svg/patternD.svg";
import { ReactComponent as PatternE } from "../assets/svg/patternE.svg";
import { ReactComponent as PatternF } from "../assets/svg/patternF.svg";
import { ReactComponent as PatternG } from "../assets/svg/patternG.svg";
import { ReactComponent as PatternH } from "../assets/svg/patternH.svg";
import { ReactComponent as PatternI } from "../assets/svg/patternI.svg";

import { ReactComponent as EyesA } from "../assets/svg/eyesA.svg";
import { ReactComponent as EyesB } from "../assets/svg/eyesB.svg";
import { ReactComponent as EyesC } from "../assets/svg/eyesC.svg";
import { ReactComponent as EyesD } from "../assets/svg/eyesD.svg";
import { ReactComponent as EyesE } from "../assets/svg/eyesE.svg";
import { ReactComponent as EyesF } from "../assets/svg/eyesF.svg";
import { ReactComponent as EyesG } from "../assets/svg/eyesG.svg";
import { ReactComponent as EyesH } from "../assets/svg/eyesH.svg";
import { ReactComponent as EyesI } from "../assets/svg/eyesI.svg";
import { ReactComponent as EyesJ } from "../assets/svg/eyesJ.svg";

import { ReactComponent as MouthA } from "../assets/svg/mouthA.svg";
import { ReactComponent as MouthB } from "../assets/svg/mouthB.svg";
import { ReactComponent as MouthC } from "../assets/svg/mouthC.svg";
import { ReactComponent as MouthD } from "../assets/svg/mouthD.svg";
import { ReactComponent as MouthE } from "../assets/svg/mouthE.svg";
import { ReactComponent as MouthF } from "../assets/svg/mouthF.svg";
import { ReactComponent as MouthG } from "../assets/svg/mouthG.svg";
import { ReactComponent as MouthH } from "../assets/svg/mouthH.svg";
import { ReactComponent as MouthI } from "../assets/svg/mouthI.svg";
import { ReactComponent as MouthJ } from "../assets/svg/mouthJ.svg";

import { ReactComponent as DecoA } from "../assets/svg/decoA.svg";
import { ReactComponent as DecoB } from "../assets/svg/decoB.svg";
import { ReactComponent as DecoC } from "../assets/svg/decoC.svg";
import { ReactComponent as DecoD } from "../assets/svg/decoD.svg";
import { ReactComponent as DecoE } from "../assets/svg/decoE.svg";
import { ReactComponent as DecoF } from "../assets/svg/decoF.svg";
import { ReactComponent as DecoG } from "../assets/svg/decoG.svg";
import { ReactComponent as DecoH } from "../assets/svg/decoH.svg";
import { ReactComponent as DecoI } from "../assets/svg/decoI.svg";

const Empty = () => null;

const greys = [
  "#ffffff",
  "#f4f4f4",
  "#dbdbdb",
  "#a3a3a3",
  "#6d6d6d",
  "#111111",
  "#070707",
];

const brights = [
  "#e02626",
  "#e54709",
  "#f2951d",
  "#f4d81f",
  "#afe51b",
  "#68e51b",
  "#38c143",
  "#28ed80",
  "#12eac6",
  "#2ca8dd",
  "#1942e8",
  "#4219e8",
  "#971bfc",
  "#cd10ea",
  "#f41fb4",
];

const brightlight = [
  "#fc4b4b",
  "#fca94b",
  "#fce44b",
  "#cdfc4b",
  "#7afc4b",
  "#4bfc6f",
  "#4bfcb5",
  "#56eadb",
  "#52b6f9",
  "#547cff",
  "#8060ff",
  "#c560ff",
  "#f760ff",
  "#ff60ca",
];

const pastels = [
  "#f9a7a7",
  "#f7c9a0",
  "#f7eaaa",
  "#e1f79b",
  "#afe59c",
  "#9ce5b3",
  "#8ef2ed",
  "#79cbf2",
  "#a2b6f2",
  "#889bea",
  "#b599ff",
  "#d981f9",
  "#f7a8e6",
];
const offWhite = [
  "#fceaea",
  "#f9f9e8",
  "#e6f7e8",
  "#e1f3f4",
  "#dee0f4",
  "#f5e6f7",
];

const deeper = [
  "#c10000",
  "#c68005",
  "#d6d200",
  "#5bba12",
  "#0dbc18",
  "#0dbc6d",
  "#21c4bc",
  "#0463c9",
  "#1d30ba",
  "#5405b5",
  "#a31caf",
  "#c10b69",
];

const dark = [
  "#5e0c0c",
  "#724c15",
  "#405e04",
  "#095e04",
  "#0a754f",
  "#046868",
  "#0e4c70",
  "#191a77",
  "#33066b",
  "#62066b",
  "#6b0348",
];

const greyed = [
  "#825757",
  "#827d57",
  "#698257",
  "#57826a",
  "#577a82",
  "#575782",
  "#745782",
  "#825771",
];

const slated = ["#3d2222", "#12351d", "#122b35", "#1d1e30", "#331d2b"];

const deepDark = [
  "#0f0707",
  "#1f2305",
  "#062305",
  "#032b20",
  "#0d1a28",
  "#150f1e",
];

const extraDark = ["#21181b", "#18211a", "#181a21"];

const colors = [
  ...greys,
  ...offWhite,
  ...pastels,
  ...brightlight,
  ...brights,
  ...deeper,
  ...dark,
  ...greyed,
  ...slated,
  ...deepDark,
  ...extraDark,
];

const eyeColors = [
  "#ed1515",
  "#f4ba09",
  "#c6fc05",
  "#3aef37",
  "#10bcd3",
  "#1e47cc",
  "#7d31f7",
  "#f731f4",
  "#000000",
  "#919eb7",
];

export const catConfig = {
  properties: {
    mainColor: {
      variations: colors,
    },
    secondaryColor: {
      variations: colors,
    },
    patternColor: {
      variations: colors,
    },
    eyeColor: {
      variations: eyeColors,
    },
    pattern: {
      variations: [
        Empty,
        PatternA,
        PatternB,
        PatternC,
        PatternD,
        PatternE,
        PatternF,
        PatternG,
        PatternH,
        PatternI,
      ],
    },
    eyes: {
      variations: [
        EyesA,
        EyesB,
        EyesC,
        EyesD,
        EyesE,
        EyesF,
        EyesG,
        EyesH,
        EyesI,
        EyesJ,
      ],
    },
    mouth: {
      variations: [
        MouthA,
        MouthB,
        MouthC,
        MouthD,
        MouthE,
        MouthF,
        MouthG,
        MouthH,
        MouthI,
        MouthJ,
      ],
    },
    decoration: {
      variations: [
        Empty,
        DecoA,
        DecoB,
        DecoC,
        DecoD,
        DecoE,
        DecoF,
        DecoG,
        DecoH,
        DecoI,
      ],
    },
    hidden1: {
      variations: [...Array(10).keys()],
    },
    hidden2: {
      variations: [...Array(10).keys()],
    },
    hidden3: {
      variations: [...Array(10).keys()],
    },
    bonus1: {
      variations: [...Array(10).keys()],
    },
    bonus2: {
      variations: [...Array(10).keys()],
    },
  },
};

export type CatConfigProperties = keyof typeof catConfig.properties;
