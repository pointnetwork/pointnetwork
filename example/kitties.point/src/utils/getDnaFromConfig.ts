import { catConfig, CatConfigProperties } from "../config/catConfig";
import { CatConfig } from "../components/Cat/Cat";

export const getDnaFromConfig = (config: CatConfig) => {
  const dna = Object.keys(catConfig.properties)
    .map((key) => {
      const value = config[key as CatConfigProperties];

      if (
        catConfig.properties[key as CatConfigProperties].variations.length > 10
      ) {
        return value.toString().padStart(2, "0");
      }
      return value.toString();
    })
    .join("");

  return dna;
};
