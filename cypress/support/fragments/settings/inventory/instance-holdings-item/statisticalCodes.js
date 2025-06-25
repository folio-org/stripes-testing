import getRandomPostfix from '../../../../utils/stringTools';

const defaultStatisticalCode = {
  source: 'local',
  code: `autotest_code_${getRandomPostfix()}`,
  name: `autotest_statistical_code_${getRandomPostfix()}`,
  statisticalCodeTypeId: '3abd6fc2-b3e4-4879-b1e1-78be41769fe3',
};

function getListOfStatisticalCodesNames() {
  const cells = [];

  cy.wait(2000);
  return cy
    .get('div[class^="mclRowContainer--"]')
    .find('[data-row-index]')
    .each(($row) => {
      // from each row, choose specific cell
      cy.get('[class*="mclCell-"]:nth-child(2)', { withinSubject: $row })
        // extract its text content
        .invoke('text')
        .then((cellValue) => {
          cells.push(cellValue);
        });
    })
    .then(() => cells);
}

export default {
  getListOfStatisticalCodesNames,
  createViaApi(body = defaultStatisticalCode) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'statistical-codes',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },

  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `statistical-codes/${id}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },

  verifyListOfStatisticalCodesIsIdenticalToListInInstance(statusesFromInstance) {
    getListOfStatisticalCodesNames().then((codesFromList) => {
      const result = codesFromList.every((element2) => statusesFromInstance.some((element1) => element1.includes(element2)));
      expect(result).to.equal(true);
    });
  },
};
