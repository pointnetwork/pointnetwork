import { CatConfig } from "../components/Cat/Cat";

export const shouldShowDecoration = (catConfig: CatConfig) => {
  return catConfig.hidden1 > 5 && catConfig.decoration > 0;
};

export const shouldShowPattern = (catConfig: CatConfig) => {
  return catConfig.hidden2 > 5 && catConfig.pattern > 0;
};
