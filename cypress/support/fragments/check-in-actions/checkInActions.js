import uuid from 'uuid';
import moment from 'moment';
import { HTML, including } from '@interactors/html';
import {
  Button,
  TextField,
  MultiColumnListRow,
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  Modal,
  PaneContent,
  or,
} from '../../../../interactors';
import { REQUEST_METHOD } from '../../constants';
import { getLongDelay } from '../../utils/cypressTools';
import ItemRecordView from '../inventory/item/itemRecordView';

const loanDetailsButton = Button('Loan details');
const patronDetailsButton = Button('Patron details');
const itemDetailsButton = Button('Item details');
const requestDetailsButton = Button('Request details');
const printTransitSlipButton = Button('Print transit slip');
const printHoldSlipButton = Button('Print hold slip');
const newFeeFineButton = Button('New Fee/Fine');
const checkInButton = Button('Check in');
const itemBarcodeField = TextField({ name: 'item.barcode' });
const addItemButton = Button({ id: 'clickable-add-item' });
const availableActionsButton = Button({ id: 'available-actions-button-0' });
const confirmModal = Modal('Confirm multipiece check in');
const checkInButtonInModal = confirmModal.find(Button('Check in'));
const endSessionButton = Button({ id: 'clickable-end-session' });
const feeFineDetailsButton = Button('Fee/fine details');
const feeFinePane = PaneContent({ id: 'pane-account-action-history-content' });
const pieces = TextField({ id: 'additem_numberofpieces' });
const numberOfPieces = TextField({ name: 'numberOfPieces' });
const numberOfMissingPieces = TextField({ name: 'numberOfMissingPieces' });
const descriptionOfmissingPieces = TextField({ name: 'missingPieces' });
const actionsButton = Button('Actions');
const editButton = Button('Edit');
const closeButton = Button({ icon: 'times' });
const actionsButtons = {
  loanDetails: loanDetailsButton,
  patronDetails: patronDetailsButton,
  itemDetails: itemDetailsButton,
  requestDetails: requestDetailsButton,
  newFeeFine: newFeeFineButton,
  printTransitSlip: printTransitSlipButton,
  printHoldSlip: printHoldSlipButton,
};
const itemAnumberOfPieces = '2';
const waitLoading = () => {
  cy.expect(TextField({ name: 'item.barcode' }).exists());
  cy.expect(Button('End session').exists());
};
const checkInItemGui = (barcode) => {
  return cy.do([
    itemBarcodeField.exists(),
    itemBarcodeField.fillIn(barcode),
    addItemButton.click(),
  ]);
};

export default {
  waitLoading: () => {
    cy.expect(itemBarcodeField.exists());
    cy.expect(Button('End session').exists());
  },
  clickonitem() {
    cy.do(closeButton.click());
  },
  editItemDetails: (pcs, missingPieces, missingPiecesDescription) => {
    cy.do([
      actionsButton.click(),
      editButton.click(),
      numberOfPieces.click(),
      numberOfPieces.fillIn(pcs),
      numberOfMissingPieces.click(),
      numberOfMissingPieces.fillIn(missingPieces),
      descriptionOfmissingPieces.click(),
      descriptionOfmissingPieces.fillIn(missingPiecesDescription),
      Button('Save & close').click(),
    ]);
  },
  endSession() {
    cy.do(endSessionButton.click());
    // cy.expect(section('No items have been entered yet.').exists())
  },
  checkInItem: (barcode) => {
    waitLoading();
    cy.intercept('/inventory/items?*').as('getItems');
    cy.do(itemBarcodeField.fillIn(barcode));
    cy.do(addItemButton.click());
    cy.wait('@getItems', getLongDelay());
    cy.wait(1000);
  },
  verifyCheckIn() {
    cy.expect(checkInButtonInModal.exists());
    cy.do(checkInButtonInModal.click());
  },
  checkInItemGui,
  checkInItemByBarcode(barcode) {
    this.checkInItemGui(barcode);
    this.confirmCheckInLostItem();
    this.verifyLastCheckInItem(barcode);
    this.endCheckInSession();
  },
  getSessionIdAfterCheckInItem: (barcode) => {
    cy.intercept('/inventory/items?*').as('getItems');
    cy.intercept('circulation/check-in-by-barcode').as('getCheckInResponse');
    checkInItemGui(barcode);
    cy.wait('@getItems');
    return cy.wait('@getCheckInResponse', getLongDelay()).its('request.body.sessionId');
  },

  confirmCheckInLostItem: () => {
    cy.do(Button('Confirm').click());
  },

  openItemRecordInInventory: (status) => {
    cy.expect(
      MultiColumnListRow({ indexRow: 'row-0' })
        .find(HTML(including(status)))
        .exists(),
    );
    cy.do(availableActionsButton.click());
    cy.expect(itemDetailsButton.exists());
    cy.intercept('/tags?*').as('getTags');
    cy.do(itemDetailsButton.click());
    cy.wait('@getTags', getLongDelay());
    ItemRecordView.waitLoading();
  },

  checkActionsMenuOptions: (
    optionsToCheck = ['loanDetails', 'patronDetails', 'itemDetails', 'newFeeFine'],
  ) => {
    cy.expect(availableActionsButton.exists());
    cy.do(availableActionsButton.click());
    optionsToCheck.forEach((option) => {
      cy.expect(actionsButtons[option].exists());
    });
    cy.do(availableActionsButton.click());
  },

  openCheckInPane: () => {
    cy.do(checkInButton.click());
  },

  openLoanDetails: (username) => {
    cy.do([availableActionsButton.click(), loanDetailsButton.click()]);
    cy.expect(Pane(including(username)).exists());
    cy.expect(Pane(including('Loan details')).exists());
  },

  openPatronDetails: (username) => {
    cy.do([availableActionsButton.click(), patronDetailsButton.click()]);
    cy.expect(Pane({ title: including(username) }).exists());
  },

  openItemDetails: (itemBarcode) => {
    cy.do([availableActionsButton.click(), itemDetailsButton.click()]);
    cy.expect(Pane(including(itemBarcode)).exists());
  },

  openItemDetails2: () => {
    cy.do([
      availableActionsButton.click(),
      itemDetailsButton.click(),
      Button('Actions').click(),
      Button('Edit').click(),
      pieces.fillIn(itemAnumberOfPieces),
      Button('Save & close').click(),
    ]);
  },

  openRequestDetails: (itemBarcode) => {
    cy.do([availableActionsButton.click(), requestDetailsButton.click()]);
    cy.expect(Pane(including('Request Detail')).exists());
    cy.expect(HTML(including(itemBarcode)).exists());
  },

  openNewfeefinesPane: () => {
    cy.do([availableActionsButton.click(), newFeeFineButton.click()]);
    cy.expect(Modal(including('New fee/fine')).exists());
  },

  checkinItemViaApi: (body) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'circulation/check-in-by-barcode',
      body: {
        id: uuid(),
        checkInDate: moment.utc().format(),
        ...body,
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  confirmMultipleItemsCheckin(barcode) {
    cy.do(checkInButtonInModal.click());
    cy.expect(
      MultiColumnList({ id: 'list-items-checked-in' })
        .find(HTML(including(barcode)))
        .exists(),
    );
  },

  verifyLastCheckInItem(itemBarcode) {
    return cy.expect(
      MultiColumnListRow({ indexRow: 'row-0' })
        .find(MultiColumnListCell({ content: including(itemBarcode) }))
        .exists(),
    );
  },

  endCheckInSession: () => {
    cy.do(endSessionButton.click());
    cy.intercept('/circulation/end-patron-action-session').as('end-patron-session');
    cy.wait('@end-patron-session').then((xhr) => {
      cy.wrap(xhr.response.statusCode).should('eq', 204);
    });
  },

  checkFeeFinesDetails(
    billedAmount,
    instanceBarcode,
    loanPolicyName,
    OverdueFinePolicyName,
    LostItemFeePolicyName,
  ) {
    cy.do(availableActionsButton.click());
    cy.do(feeFineDetailsButton.click());
    cy.expect(Pane(including('Fee/fine details')).exists());
    cy.expect(feeFinePane.find(HTML(including('Overdue fine'))).exists());
    cy.expect(
      or(
        feeFinePane.find(HTML(including(`${billedAmount}.00`))).exists(),
        feeFinePane.find(HTML(including(`${billedAmount + 1}.00`))).exists(),
      ),
    );
    cy.expect(feeFinePane.find(HTML(including('Outstanding'))).exists());
    cy.expect(feeFinePane.find(HTML(including(instanceBarcode))).exists());
    cy.expect(feeFinePane.find(HTML(including(loanPolicyName))).exists());
    cy.expect(feeFinePane.find(HTML(including(OverdueFinePolicyName))).exists());
    cy.expect(feeFinePane.find(HTML(including(LostItemFeePolicyName))).exists());
  },

  endCheckInSessionAndCheckDetailsOfCheckInAreCleared: () => {
    cy.wait(2000);
    cy.do(endSessionButton.click());
    cy.expect(
      PaneContent({ id: 'check-in-content' })
        .find(HTML(including('No items have been entered yet.')))
        .exists(),
    );
  },

  backdateCheckInItem: (date, barcode) => {
    cy.do(Button('today').click());
    cy.do(TextField({ name: 'item.checkinDate' }).fillIn(date));
    waitLoading();
    cy.intercept('/inventory/items?*').as('getItems');
    cy.do(itemBarcodeField.fillIn(barcode));
    cy.do(addItemButton.click());
    cy.wait('@getItems', getLongDelay());
  },
};
