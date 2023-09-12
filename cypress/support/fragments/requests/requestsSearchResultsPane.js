import { Button, PaneHeader, Pane, Checkbox } from '../../../../interactors';

const newRequestButton = Button({ id: 'clickable-newrequest' }).has({
  visible: true,
  disabled: false,
});
const exportToCSVButton = Button({ id: 'exportToCsvPaneHeaderBtn' }).has({
  visible: true,
  disabled: true,
});
const exportExpiredHoldsToCSVButton = Button({ id: 'exportExpiredHoldsToCsvPaneHeaderBtn' }).has({
  visible: true,
  disabled: true,
});
const printPickSlipsButton = Button({ id: 'printPickSlipsBtn' }).has({
  visible: true,
  disabled: true,
});
const requestDateCheckbox = Checkbox({ name: 'requestDate' });
const yearCheckbox = Checkbox({ name: 'year' });
const itemBarcodeCheckbox = Checkbox({ name: 'itemBarcode' });
const typeCheckbox = Checkbox({ name: 'type' });
const requestStatusCheckbox = Checkbox({ name: 'requestStatus' });
const queuePositionCheckbox = Checkbox({ name: 'position' });
const requesterCheckbox = Checkbox({ name: 'requester' });
const requesterBarcodeCheckbox = Checkbox({ name: 'requesterBarcode' });
const proxyCheckbox = Checkbox({ name: 'proxy' });

const actionsButtonInSearchResultsPane = Pane({ id: 'pane-results' }).find(Button('Actions'));

const actionsOptionsButtons = {
  newRequest: newRequestButton,
  exportResultsToCSV: exportToCSVButton,
  exportExpiredHoldsToCSV: exportExpiredHoldsToCSVButton,
  printPickSlips: printPickSlipsButton,
};
const actionsOptionsCheckboxes = {
  requestDate: requestDateCheckbox,
  year: yearCheckbox,
  itemBarcode: itemBarcodeCheckbox,
  type: typeCheckbox,
  requestStatus: requestStatusCheckbox,
  queuePosition: queuePositionCheckbox,
  requester: requesterCheckbox,
  requesterBarcode: requesterBarcodeCheckbox,
  proxy: proxyCheckbox,
};

export default {
  waitLoading: () => cy.expect(PaneHeader('Requests').exists()),
  verifyOptionsInActionsMenu: (
    optionsButtons = [
      'newRequest',
      'exportResultsToCSV',
      'exportExpiredHoldsToCSV',
      'printPickSlips',
    ],
    optionsCheckboxes = [
      'requestDate',
      'year',
      'itemBarcode',
      'type',
      'requestStatus',
      'queuePosition',
      'requester',
      'requesterBarcode',
      'proxy',
    ],
  ) => {
    cy.expect(actionsButtonInSearchResultsPane.exists());
    cy.do(actionsButtonInSearchResultsPane.click());
    optionsButtons.forEach((option) => {
      cy.expect(actionsOptionsButtons[option]);
    });
    optionsCheckboxes.forEach((option) => {
      cy.expect(actionsOptionsCheckboxes[option].has({ checked: true }));
    });
    cy.do(actionsButtonInSearchResultsPane.click());
  },
};
