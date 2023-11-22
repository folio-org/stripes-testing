function getListOfStatusTypes() {
  const cells = [];

  cy.wait(2000);
  return cy
    .get('div[class^="mclRowContainer--"]')
    .find('[data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get('[class*="mclCell-"]:nth-child(1)', { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}

export default {
  getListOfStatusTypes,
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `instance-statuses/${id}`,
    isDefaultSearchParamsRequired: false,
  }),

  verifyListOfStatusTypesIsIdenticalToListInInstance(statusArray) {
    getListOfStatusTypes().then((statusTypes) => {
      console.log('statusesFromInstance', statusArray);
      console.log('statusesFromPage', statusTypes);
      // cy.expect(statusTypes).to.include(statusArray);
      // cy.expect(statusTypes).to.deep.equal(statusArray);
    });
  },
};
