import getRandomPostfix from '../../../../utils/stringTools';
import {
  Button,
  including,
  MultiColumnListRow,
  MultiColumnListCell,
} from '../../../../../../interactors';

export const reasonsActions = {
  edit: 'edit',
  trash: 'trash',
};
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
  createViaApi() {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'statistical-codes',
        body: defaultStatisticalCode,
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
    });
  },

  verifyListOfStatisticalCodesIsIdenticalToListInInstance(statusesFromInstance) {
    getListOfStatisticalCodesNames().then((codesFromList) => {
      const result = codesFromList.every((element2) => statusesFromInstance.some((element1) => element1.includes(element2)));
      expect(result).to.equal(true);
    });
  },

  verifyStatisticalCodeInTheList({ name, source, actions = [] }) {
    const row = MultiColumnListRow({ content: including(name) });
    const actionsCell = MultiColumnListCell({ columnIndex: 5 });
    cy.expect([
      row.exists(),
      row.find(MultiColumnListCell({ columnIndex: 3, content: source })).exists(),
    ]);
    if (actions.length === 0) {
      cy.expect(row.find(actionsCell).has({ content: source }));
    } else {
      Object.values(reasonsActions).forEach((action) => {
        const buttonSelector = row.find(actionsCell).find(Button({ icon: action }));
        if (actions.includes(action)) {
          cy.expect(buttonSelector.exists());
        } else {
          cy.expect(buttonSelector.absent());
        }
      });
    }
  },

  verifyStatisticalCodeAbsentInTheList({ name }) {
    const row = MultiColumnListRow({ content: including(name) });
    cy.expect(row.absent());
  },

  clickTrashButtonForStatisticalCode(name) {
    cy.do([
      MultiColumnListRow({ content: including(name) })
        .find(MultiColumnListCell({ columnIndex: 5 }))
        .find(Button({ icon: 'trash' }))
        .click(),
      Button('Delete').click(),
    ]);
  },
};
