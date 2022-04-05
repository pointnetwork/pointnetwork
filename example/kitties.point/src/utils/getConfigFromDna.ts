import { catConfig, CatConfigProperties } from "../config/catConfig";
import { CatConfig } from "../components/Cat/Cat";

export const getConfigFromDna = (dna: string) => {
  let dnaIndex = 0;

  // Account for dna that starts with leading zero(s)
  const validDna = dna.padStart(16);

  const config = Object.keys(catConfig.properties).reduce(
    (total, currentKey) => {
      let value;

      if (
        catConfig.properties[currentKey as CatConfigProperties].variations
          .length > 10
      ) {
        value = validDna.substr(dnaIndex, 2);
        dnaIndex += 2;
      } else {
        value = validDna.substr(dnaIndex, 1);
        dnaIndex += 1;
      }

      // const value =
      return {
        ...total,
        [currentKey]: Number(value),
      };
    },
    {}
  );

  return config as CatConfig;
};
