import React from "react";
import { Container, Grid, Typography, Link } from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileContract, faHeart } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

export const Footer = () => {
  return (
    <footer>
      <Container>
        <Grid container>
          <Grid item xs>
            <Typography variant="subtitle1" color="textSecondary" component="p">
              Made with <FontAwesomeIcon icon={faHeart} /> by Erno Wever
              <br />
            </Typography>
          </Grid>
          <Grid item xs>
            <Typography
              variant="subtitle1"
              color="textSecondary"
              component="p"
              align="right"
            >
              <Link
                href="https://github.com/ErnoW/crypto-kitties"
                target="_blank"
                rel="noopener"
              >
                <FontAwesomeIcon fixedWidth icon={faGithub} />
              </Link>{" "}
              <Link
                href="https://ropsten.etherscan.io/address/0xd5fD45667A3069857f3C86D952Ae6aA350951f87"
                target="_blank"
                rel="noopener"
              >
                <FontAwesomeIcon fixedWidth icon={faFileContract} />
              </Link>
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </footer>
  );
};
