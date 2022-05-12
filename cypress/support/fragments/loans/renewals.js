import { including } from '@interactors/html';
import {
  Button,
  TextField,
  TextArea,
  PaneHeader,
  Modal,
  KeyValue,
  MultiColumnList,
  MultiColumnListHeader,
  MultiColumnListCell,
  MultiColumnListRow,
} from '../../../../interactors';
import dateTools from '../../utils/dateTools';

const fieldLabels = {
  date: 'Date*',
  time: 'Time*',
  additionalInfo: 'Additional information*',
};
const overrideData = {
  date: dateTools.getCurrentDate(),
  simplifiedDate: dateTools.getFormattedDateWithSlashes({ date: new Date() }),
  time: '11:11 AM',
  additionalInfo: 'Override additional information',
  status: 'Checked out',
};
const buttonLabels = {
  close: 'Close',
  cancel: 'Cancel',
  override: 'Override',
  renew: 'Renew',
};
const headers = {
  loansPage: 'Loan details -',
  renewConfirmation: 'Renew Confirmation',
  override: 'Override & renew',
};
const loanInfo = {
  notRenewed: '1 item not renewed.',
  overrideRenewed: 'Renewed through override',
  renewalNumber: '1',
};
const renewConfirmationTable = {
  headers: {
    renewalStatus: 'Renewal status',
    title: 'Title',
    itemStatus: 'Item status',
    dueDate: 'Due date',
    requests: 'Requests',
    barcode: 'Barcode',
    callNumber: 'Effective call number string',
    loanPolicy: 'Loan policy',
  },
  content: {
    status: 'Item not renewed',
    statusDetails: 'loan is not renewable',
  },
};
const overrideTable = {
  headers: {
    newDueDate: 'New due date',
  },
  content: {
    selectDueDate: 'Select due date above',
  },
};
const scrollParams = {
  direction: 'left',
  value: 600,
};

const checkLoansPage = () => {
  cy.expect(PaneHeader(including(headers.loansPage)).exists());

  cy.do(Button(buttonLabels.renew).click());

  cy.expect(Modal({ content: including(loanInfo.notRenewed) }).exists());
};

const checkModalTable = (modalTitle, itemData) => {
  const modal = Modal(modalTitle);
  cy.expect([
    modal
      .find(MultiColumnListCell({ content: including(renewConfirmationTable.content.status) })).exists(),
    modal
      .find(MultiColumnListCell({ content: including(renewConfirmationTable.content.statusDetails) })).exists(),
    MultiColumnListHeader(renewConfirmationTable.headers.renewalStatus).exists(),
    MultiColumnListHeader(renewConfirmationTable.headers.title).exists(),
    MultiColumnListHeader(renewConfirmationTable.headers.itemStatus).exists(),
    MultiColumnListHeader(renewConfirmationTable.headers.dueDate).exists(),
    modal
      .find(MultiColumnListCell({ content: itemData.title, row: 0 })).exists(),
    modal
      .find(MultiColumnListCell({ content: itemData.status, row: 0 })).exists(),
    modal
      .find(MultiColumnListCell({ content: itemData.requests, row: 0 })).exists(),
  ]);

  cy.do(modal.find(MultiColumnList())
    .scrollBy(scrollParams));

  cy.expect([
    MultiColumnListHeader(renewConfirmationTable.headers.requests).exists(),
    MultiColumnListHeader(renewConfirmationTable.headers.barcode).exists(),
    MultiColumnListHeader(renewConfirmationTable.headers.callNumber).exists(),
    MultiColumnListHeader(renewConfirmationTable.headers.loanPolicy).exists(),
    modal
      .find(MultiColumnListCell({ content: itemData.barcode, row: 0 })).exists(),
    modal
      .find(MultiColumnListCell({ content: itemData.loanPolicy, row: 0 })).exists(),
  ]);
};

const generateInitialLink = (userId, loanId) => `users/${userId}/loans/view/${loanId}`;

export default {
  renewWithoutOverrideAccess(loanId, userId, itemData) {
    cy.visit(generateInitialLink(userId, loanId));

    checkLoansPage();

    checkModalTable(headers.renewConfirmation, itemData);

    // todo: Uncomment button check after permission issue fix (ticket number UIU-2604)
    // cy.expect(Button(buttonLabels.override).exists());
    cy.do(Button(buttonLabels.close).click());
  },

  renewWithOverrideAccess(loanId, userId, itemData) {
    cy.visit(generateInitialLink(userId, loanId));

    checkLoansPage();

    checkModalTable(headers.renewConfirmation, itemData);

    cy.expect([
      Button(buttonLabels.override).exists(),
      Button(buttonLabels.close).exists()
    ]);
  },

  startOverriding(itemData) {
    cy.do(Button(buttonLabels.override).click());

    cy.expect([
      Modal(headers.override).exists(),
      TextField(fieldLabels.date).exists(),
      TextField(fieldLabels.time).exists(),
      MultiColumnListHeader(overrideTable.headers.newDueDate).exists(),
      Modal(headers.override)
        .find(MultiColumnListCell({ content: including(overrideTable.content.selectDueDate) })).exists(),
    ]);

    checkModalTable(headers.override, itemData);

    cy.expect([
      TextArea(fieldLabels.additionalInfo).exists(),
      Button(buttonLabels.cancel).exists(),
      Button({ text: buttonLabels.override, disabled: true }).exists(),
    ]);
  },

  fillOverrideInfo() {
    cy.do([
      TextField(fieldLabels.date).fillIn(overrideData.date),
      TextField(fieldLabels.time).fillIn(overrideData.time),
    ]);
    cy.get('[name=check-all]').click();
    cy.do(TextArea(fieldLabels.additionalInfo).fillIn(overrideData.additionalInfo));
  },

  overrideLoan() {
    const fullOverrideDate = `${overrideData.simplifiedDate}, ${overrideData.time}`;

    cy.do(Modal(headers.override).find(Button(buttonLabels.override)).click());

    cy.expect([
      KeyValue({ value: loanInfo.renewalNumber }).exists(),
      KeyValue({ value: fullOverrideDate }).exists(),
    ]);
  },

  checkLoanDetails({ firstName, lastName }) {
    const firstTableRow = MultiColumnListRow({ index: 0 });
    const fullOverrideDate = `${overrideData.simplifiedDate}, ${overrideData.time}`;

    cy.expect([
      firstTableRow.find(MultiColumnListCell(loanInfo.overrideRenewed)).exists(),
      firstTableRow.find(MultiColumnListCell(fullOverrideDate)).exists(),
      firstTableRow.find(MultiColumnListCell(overrideData.status)).exists(),
      firstTableRow.find(MultiColumnListCell(`${lastName}, ${firstName}`)).exists(),
      firstTableRow.find(MultiColumnListCell(overrideData.additionalInfo)).exists(),
    ]);
  },
};
