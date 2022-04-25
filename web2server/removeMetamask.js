module.exports = `
const CHECK_INTERVAL = 10 * 1000;

function removeMetamask() {
  if (window.ethereum) {
        window.ethereum = undefined;
    }
}

function ensureMetamaskIsRemoved() {
    setTimeout(() => {
        removeMetamask();
        ensureMetamaskIsRemoved();
    }, CHECK_INTERVAL);
}

removeMetamask();
ensureMetamaskIsRemoved();
`;
