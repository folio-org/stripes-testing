import {
  Pane,
  Modal,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiColumnListCell,
  Button,
  including,
} from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';
import InteractorsTools from '../../../../utils/interactorsTools';

const defaultStatisticalCode = {
  source: 'local',
  code: `autotest_code_${getRandomPostfix()}`,
  name: `autotest_statistical_code_${getRandomPostfix()}`,
  statisticalCodeTypeId: '3abd6fc2-b3e4-4879-b1e1-78be41769fe3',
};
const rootPane = Pane('Statistical codes');
const columnNames = [
  'Statistical codes',
  'Statistical code names',
  'Statistical code types',
  'Source',
  'Last updated',
  'Actions',
];
const ACTIONS = {
  DELETE: 'trash',
  EDIT: 'edit',
};
const deleteConfirmModal = Modal('Delete Statistical code');
const deleteButton = Button('Delete');
const deleteErrorModal = Modal('Cannot delete Statistical code');
const deleteErrorModalMessage =
  'This Statistical code cannot be deleted, as it is in use by one or more records.';
const okayButton = Button('Okay');
const deleteNotificationText = (code) => `The Statistical code ${code} was successfully deleted`;

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
  ACTIONS,
  waitLoading() {
    cy.expect(rootPane.exists());
    columnNames.forEach((header) => {
      cy.expect(rootPane.find(MultiColumnListHeader(header)).exists());
    });
  },
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

  clickActionIconForStatisticalCode(code, name, action) {
    cy.do([
      MultiColumnListRow({ content: including(`${code}${name}`), isContainer: false })
        .find(MultiColumnListCell({ columnIndex: 5 }))
        .find(Button({ icon: action }))
        .click(),
    ]);
  },

  confirmDeleteStatisticalCode() {
    cy.do([deleteConfirmModal.find(deleteButton).click()]);
    cy.expect(deleteConfirmModal.absent());
  },

  verifyDeleteErrorModal() {
    cy.expect([
      deleteErrorModal.exists(),
      deleteErrorModal.has({ message: deleteErrorModalMessage }),
      deleteErrorModal.find(okayButton).exists(),
    ]);
  },

  dismissDeleteErrorModal() {
    cy.do(deleteErrorModal.find(okayButton).click());
    cy.expect(deleteErrorModal.absent());
  },

  verifyStatisticalCodeShown(code, name, isShown = true) {
    const targetRow = MultiColumnListRow({ content: including(`${code}${name}`) });
    if (isShown) cy.expect(targetRow.exists());
    else cy.expect(targetRow.absent());
  },

  checkDeleteNotification(code) {
    InteractorsTools.checkCalloutMessage(deleteNotificationText(code));
  },
};
