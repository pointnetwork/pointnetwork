const truncateTable = (model) =>
  model.destroy({
    where: {},
    force: true,
  });

module.exports = async function truncate(model) {
  if (model) {
    return truncateTable(model);
  }
}
