import { createMuiTheme } from "@material-ui/core";

export const primaryColor = "#f48c06";
export const secondaryColor = "#3d405b";

export const theme = createMuiTheme({
  palette: {
    type: "light",
    primary: {
      main: primaryColor,
    },
    secondary: {
      main: secondaryColor,
    },
    text: {
      primary: "rgba(0, 0, 0, 0.81)",
      secondary: "rgba(0, 0, 0, 0.49)",
      disabled: "rgba(0, 0, 0, 0.35)",
      hint: "rgba(0, 0, 0, 0.34)",
    },
    background: {
      paper: "#fff",
      default: "#efefef",
    },
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
  },
  shape: {
    borderRadius: 6,
  },
});
