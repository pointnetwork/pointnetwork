import React from "react";
import styled from "styled-components";
import { ReactComponent as Base } from "../../assets/svg/base.svg";
import { ReactComponent as Paws } from "../../assets/svg/paws.svg";
import { ReactComponent as Whiskers } from "../../assets/svg/whiskers.svg";
import Color from "color";
import { catConfig, CatConfigProperties } from "../../config/catConfig";
import { getConfigFromDna } from "../../utils/getConfigFromDna";

export type CatConfig = { [key in CatConfigProperties]: number };

interface CatPropsConfig {
  config: CatConfig;
  maxWidth?: number;
}

interface CatPropsDna {
  dna: string;
  maxWidth?: number;
}

type CatProps = CatPropsConfig | CatPropsDna;

const CatWrapper = styled.div<{
  mainColor: string;
  mainColorDark: string;
  secondaryColor: string;
  patternColor: string;
  eyesColor: string;
  maxWidth?: number;
}>`
  width: 100%;
  max-width: ${(props) => (props.maxWidth ? `${props.maxWidth}px` : "")};
  position: relative;

  &::after {
    content: "";
    display: block;
    padding-bottom: 110%;
  }

  .main-fill {
    fill: ${(props) => props.mainColor};
  }
  .main-stroke {
    stroke: ${(props) => props.mainColorDark};
  }
  .main-dark-fill {
    fill: ${(props) => props.mainColorDark};
  }
  .secondary-fill {
    fill: ${(props) => props.secondaryColor};
  }
  .pattern-fill {
    fill: ${(props) => props.patternColor};
  }
  .eye-fill {
    fill: ${(props) => props.eyesColor};
  }
  .pattern-fill {
    fill: ${(props) => props.patternColor};
  }
`;

export const Cat = (props: CatProps) => {
  const config = "config" in props ? props.config : getConfigFromDna(props.dna);
  const {
    mainColor,
    secondaryColor,
    patternColor,
    eyeColor,
    eyes,
    mouth,
    decoration,
    pattern,
    hidden1,
    hidden2,
  } = config;
  const { maxWidth } = props;

  const PatternComponent = catConfig.properties.pattern.variations[pattern];
  const EyesComponent = catConfig.properties.eyes.variations[eyes];
  const MouthComponent = catConfig.properties.mouth.variations[mouth];
  const DecorationComponent =
    catConfig.properties.decoration.variations[decoration];

  const mainColorHex = Color(
    catConfig.properties.mainColor.variations[mainColor]
  ).toString();
  const mainColorDarkHex = Color(
    catConfig.properties.mainColor.variations[mainColor]
  )
    .darken(0.65)
    .saturate(0.5)
    .toString();
  const secondaryColorHex = Color(
    catConfig.properties.secondaryColor.variations[secondaryColor]
  ).toString();
  const patternColorHex = Color(
    catConfig.properties.patternColor.variations[patternColor]
  ).toString();
  const eyesColorHex = Color(
    catConfig.properties.eyeColor.variations[eyeColor]
  ).toString();

  const showDecoration = hidden1 > 5;
  const showPattern = hidden2 > 5;

  return (
    <CatWrapper
      mainColor={mainColorHex}
      mainColorDark={mainColorDarkHex}
      secondaryColor={secondaryColorHex}
      patternColor={patternColorHex}
      eyesColor={eyesColorHex}
      maxWidth={maxWidth}
    >
      <Base style={{ position: "absolute", top: 0, left: 0 }} />
      {showPattern && (
        <PatternComponent style={{ position: "absolute", top: 0, left: 0 }} />
      )}
      <EyesComponent style={{ position: "absolute", top: 0, left: 0 }} />
      <MouthComponent style={{ position: "absolute", top: 0, left: 0 }} />
      {showDecoration && (
        <DecorationComponent
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      )}
      <Paws style={{ position: "absolute", top: 0, left: 0 }} />
      <Whiskers style={{ position: "absolute", top: 0, left: 0 }} />

      {/* <StyledCatBase colorMain={colorMain} colorLight={colorLight} colorDark={colorDark} /> */}
    </CatWrapper>
  );
};
