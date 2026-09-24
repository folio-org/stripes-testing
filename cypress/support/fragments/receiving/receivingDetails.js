import {
  Badge,
  Button,
  Section,
  KeyValue,
  including,
  not,
  MultiColumnListCell,
  Link,
  PaneHeader,
  MultiColumnList,
  Checkbox,
  DropdownMenu,
} from '../../../../interactors';
import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  EXPECTED_TABLE_COLUMN_HEADERS,
  RECEIVED_TABLE_COLUMN_HEADERS,
  RECEIVING_BOUND_ITEMS_COLUMN_LABELS,
  THE_LIST_CONTAINS_NO_ITEMS,
  UNRECEIVABLE_TABLE_COLUMN_HEADERS,
} from '../../constants';
import { ItemRecordView } from '../inventory';
import InventoryInstance from '../inventory/inventoryInstance';
import MultiColumnListHelper from '../multiColumnList';
import OrderLineDetails from '../orders/orderLineDetails';
import EditPieceModal from './modals/editPieceModal';
import ReceivingEditForm from './receivingEditForm';
import ReceivingsListEditForm from './receivingsListEditForm';

const receivingDetailsSection = Section({ id: 'pane-title-details' });
const receinvingDetailsHeader = PaneHeader({ id: 'paneHeaderpane-title-details' });
const instanceDetailsLink = receivingDetailsSection.find(
  Link({ href: including('/inventory/view/') }),
);
const titleInformationSection = receivingDetailsSection.find(Section({ id: 'information' }));
const orderLineDetailsSection = receivingDetailsSection.find(Section({ id: 'polDetails' }));
const expectedSection = receivingDetailsSection.find(Section({ id: 'expected' }));
const receivedSection = receivingDetailsSection.find(Section({ id: 'received' }));
const unreceivableSection = receivingDetailsSection.find(Section({ id: 'unreceivable' }));
const routingListSection = receivingDetailsSection.find(Section({ id: 'routing-list' }));
const routingListAccordionButton = Button({ id: 'accordion-toggle-button-routing-list' });
const expectedRowsSelector = '#expected [class*="mclRowFormatterContainer"]';
const receivedRowsSelector = '#received [class*="mclRowFormatterContainer"]';
const unreceivableRowsSelector = '#unreceivable [class*="mclRowFormatterContainer"]';

const boundItemsAccordion = Section({ id: 'boundItems' });
const boundItemsList = MultiColumnList({ id: 'bound-items-list' });

const ADD_PIECE_BUTTON_LABEL = 'Add piece';

const buttons = {
  Actions: receinvingDetailsHeader.find(Button('Actions')),
  Edit: Button('Edit'),
  'Collapse all': receivingDetailsSection.find(Button('Collapse all')),
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(receivingDetailsSection.exists());
  },
  checkTitlePaneIsDisplayed(title) {
    cy.expect(receivingDetailsSection.exists());
    if (title) {
      cy.expect(receinvingDetailsHeader.has({ text: including(title) }));
    }
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  checkReceivingDetails({ information = [], orderLineDetails = [], expected, received } = {}) {
    cy.expect(titleInformationSection.exists());
    information.forEach(({ key, value }) => {
      cy.expect(titleInformationSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    cy.expect(orderLineDetailsSection.exists());
    orderLineDetails.forEach(({ key, value }) => {
      cy.expect(orderLineDetailsSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    cy.expect(expectedSection.exists());
    if (expected) {
      this.checkExpectedTableContent(expected);
    }

    cy.expect(receivedSection.exists());
    if (received) {
      this.checkReceivedTableContent(received);
    }
  },
  expandTitleInformationAccordion() {
    cy.do(
      titleInformationSection.find(Button({ id: 'accordion-toggle-button-information' })).click(),
    );
  },
  verifyAcquisitionUnitInTitleInformation(acquisitionUnitName, shouldExist = true) {
    cy.do(
      titleInformationSection.find(Button({ id: 'accordion-toggle-button-information' })).click(),
    );
    cy.wait(1000);
    if (shouldExist) {
      cy.expect(
        titleInformationSection
          .find(KeyValue('Acquisition units'))
          .has({ value: including(acquisitionUnitName) }),
      );
    } else {
      cy.expect(
        titleInformationSection
          .find(KeyValue('Acquisition units'))
          .has({ value: not(including(acquisitionUnitName)) }),
      );
    }
  },
  verifyAcquisitionUnitNotSpecified() {
    cy.expect(
      titleInformationSection.find(KeyValue('Acquisition units')).has({ value: 'No value set-' }),
    );
  },
  closeDetailsPane() {
    cy.do(receinvingDetailsHeader.find(Button({ icon: 'times' })).click());
  },
  verifyExpectedRecordsCount(expectedCount) {
    if (expectedCount === 0) {
      cy.expect(expectedSection.has({ text: including(THE_LIST_CONTAINS_NO_ITEMS) }));
    } else {
      cy.get(expectedRowsSelector).should('have.length', expectedCount);
    }
  },
  verifyReceivedRecordsCount(receivedCount) {
    if (receivedCount === 0) {
      cy.expect(receivedSection.has({ text: including(THE_LIST_CONTAINS_NO_ITEMS) }));
    } else {
      cy.get(receivedRowsSelector).should('have.length', receivedCount);
    }
  },
  verifyUnreceivableRecordsCount(unreceivableCount) {
    if (unreceivableCount === 0) {
      cy.expect(unreceivableSection.has({ text: including(THE_LIST_CONTAINS_NO_ITEMS) }));
    } else {
      cy.get(unreceivableRowsSelector).should('have.length', unreceivableCount);
    }
  },
  checkExpectedTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.status) {
        cy.expect(
          expectedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: EXPECTED_TABLE_COLUMN_HEADERS.STATUS,
              }),
            )
            .has({ content: including(record.status) }),
        );
      }
      if (record.copyNumber) {
        cy.expect(
          expectedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: EXPECTED_TABLE_COLUMN_HEADERS.COPY_NUMBER,
              }),
            )
            .has({ content: including(record.copyNumber) }),
        );
      }
      if (record.comment) {
        cy.expect(
          expectedSection
            .find(
              MultiColumnListCell({ row: index, column: EXPECTED_TABLE_COLUMN_HEADERS.COMMENT }),
            )
            .has({ content: including(record.comment) }),
        );
      }
      if (record.format) {
        cy.expect(
          expectedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: EXPECTED_TABLE_COLUMN_HEADERS.PIECE_FORMAT,
              }),
            )
            .has({ content: including(record.format) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(expectedSection.has({ text: including(THE_LIST_CONTAINS_NO_ITEMS) }));
    }
  },
  checkReceivedTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.barcode) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({ row: index, column: RECEIVED_TABLE_COLUMN_HEADERS.BARCODE }),
            )
            .has({ content: including(record.barcode) }),
        );
      }
      if (record.format) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: RECEIVED_TABLE_COLUMN_HEADERS.PIECE_FORMAT,
              }),
            )
            .has({ content: including(record.format) }),
        );
      }
      if (record.displaySummary) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: RECEIVED_TABLE_COLUMN_HEADERS.DISPLAY_SUMMARY,
              }),
            )
            .has({ content: including(record.displaySummary) }),
        );
      }
      if (record.copyNumber) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: RECEIVED_TABLE_COLUMN_HEADERS.COPY_NUMBER,
              }),
            )
            .has({ content: including(record.copyNumber) }),
        );
      }
      if (record.enumeration) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: RECEIVED_TABLE_COLUMN_HEADERS.ENUMERATION,
              }),
            )
            .has({ content: including(record.enumeration) }),
        );
      }
      if (record.chronology) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({ row: index, column: RECEIVED_TABLE_COLUMN_HEADERS.CHRONOLOGY }),
            )
            .has({ content: including(record.chronology) }),
        );
      }
      if (record.comment) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({ row: index, column: RECEIVED_TABLE_COLUMN_HEADERS.COMMENT }),
            )
            .has({ content: including(record.comment) }),
        );
      }
      if (record.receivedDate) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: RECEIVED_TABLE_COLUMN_HEADERS.RECEIVED_DATE,
              }),
            )
            .has({ content: including(record.receivedDate) }),
        );
      }
      if (record.holdingsLocation) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: RECEIVED_TABLE_COLUMN_HEADERS.HOLDINGS_LOCATION,
              }),
            )
            .has({ content: including(record.holdingsLocation) }),
        );
      }
      if (record.displayToPublic !== undefined) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: RECEIVED_TABLE_COLUMN_HEADERS.DISPLAY_TO_PUBLIC,
              }),
            )
            .find(Checkbox({ disabled: true }))
            .has({ checked: record.displayToPublic, disabled: true }),
        );
      }
      if (record.request) {
        cy.expect(
          receivedSection
            .find(
              MultiColumnListCell({
                row: index,
                column: RECEIVED_TABLE_COLUMN_HEADERS.REQUEST,
              }),
            )
            .has({ content: including(record.request) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(receivedSection.has({ text: including(THE_LIST_CONTAINS_NO_ITEMS) }));
    }
  },
  checkUnreceivableTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.barcode) {
        cy.expect(
          unreceivableSection
            .find(
              MultiColumnListCell({
                row: index,
                column: UNRECEIVABLE_TABLE_COLUMN_HEADERS.BARCODE,
              }),
            )
            .has({ content: including(record.barcode) }),
        );
      }
      if (record.displaySummary) {
        cy.expect(
          unreceivableSection
            .find(
              MultiColumnListCell({
                row: index,
                column: UNRECEIVABLE_TABLE_COLUMN_HEADERS.DISPLAY_SUMMARY,
              }),
            )
            .has({ content: including(record.displaySummary) }),
        );
      }
      if (record.copyNumber) {
        cy.expect(
          unreceivableSection
            .find(
              MultiColumnListCell({
                row: index,
                column: UNRECEIVABLE_TABLE_COLUMN_HEADERS.COPY_NUMBER,
              }),
            )
            .has({ content: including(record.copyNumber) }),
        );
      }
      if (record.comment) {
        cy.expect(
          unreceivableSection
            .find(
              MultiColumnListCell({
                row: index,
                column: UNRECEIVABLE_TABLE_COLUMN_HEADERS.COMMENT,
              }),
            )
            .has({ content: including(record.comment) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(unreceivableSection.has({ text: including(THE_LIST_CONTAINS_NO_ITEMS) }));
    }
  },
  openEditPieceModal({ row = 0, section = 'Expected' } = {}) {
    const isExpected = section === 'Expected';
    const itemEdit = isExpected
      ? expectedSection.find(MultiColumnListCell({ row, column: 'Display summary' }))
      : receivedSection.find(MultiColumnListCell({ row, column: 'Barcode' }));

    cy.do(itemEdit.click());

    return EditPieceModal;
  },
  openReceivingEditForm() {
    cy.do([buttons.Actions.click(), buttons.Edit.click()]);
    ReceivingEditForm.waitLoading();

    return ReceivingEditForm;
  },
  editReceivingItem() {
    cy.do([buttons.Edit.click()]);
    ReceivingEditForm.waitLoading();
  },
  verifyEditButtonIsInactive() {
    cy.do(buttons.Actions.click());
    cy.expect(Button('Edit').has({ disabled: true }));
  },
  verifyAddPieceButtonAbsent() {
    cy.do(expectedSection.find(Button('Actions')).click());
    cy.expect(Button(ADD_PIECE_BUTTON_LABEL).absent());
  },
  openReceiveListEditForm() {
    cy.do([expectedSection.find(Button('Actions')).click(), Button('Receive').click()]);
    ReceivingsListEditForm.waitLoading();

    return ReceivingsListEditForm;
  },
  openInstanceDetails() {
    cy.do(instanceDetailsLink.click());
    InventoryInstance.waitInventoryLoading();

    return InventoryInstance;
  },
  openOrderLineDetails() {
    cy.do(orderLineDetailsSection.find(KeyValue('POL number')).find(Link()).click());
    OrderLineDetails.waitLoading();

    return OrderLineDetails;
  },

  checkRoutingListSectionExpanded(isExpanded = true) {
    cy.expect(routingListAccordionButton.has({ ariaExpanded: isExpanded ? 'true' : 'false' }));
  },

  expandRoutingListAccordion() {
    cy.do(routingListAccordionButton.click());
  },
  checkRoutingListSectionCounter(count) {
    cy.expect(routingListSection.find(Badge()).has({ text: count }));
  },

  checkAccordionPosition({ previousAccordionLabel, targetAccordionLabel, nextAccordionLabel }) {
    cy.get('#pane-title-details [id^="accordion-toggle-button-"]').then((accordions) => {
      const labels = [...accordions].map((accordionButton) => accordionButton.textContent.trim());
      const prevIndex = labels.findIndex((label) => label.includes(previousAccordionLabel));
      const targetIndex = labels.findIndex((label) => label.includes(targetAccordionLabel));
      const nextIndex = labels.findIndex((label) => label.includes(nextAccordionLabel));

      expect(targetIndex).to.equal(prevIndex + 1);
      expect(targetIndex).to.equal(nextIndex - 1);
    });
  },

  checkRoutingListTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.name) {
        cy.expect(
          routingListSection
            .find(MultiColumnListCell({ row: index, column: 'Name' }))
            .has({ content: including(record.name) }),
        );
      }
      if (record.notes) {
        cy.expect(
          routingListSection
            .find(MultiColumnListCell({ row: index, column: 'Notes' }))
            .has({ content: including(record.notes) }),
        );
      }
      if (record.users) {
        const users = Array.isArray(record.users) ? record.users.join(', ') : record.users;
        cy.expect(
          routingListSection
            .find(MultiColumnListCell({ row: index, column: 'Users' }))
            .has({ content: including(users) }),
        );
      }
    });
  },

  assertBoundItemsListCount(expectedCount) {
    cy.expect(boundItemsList.has({ rowCount: expectedCount }));
  },

  assertBoundItemsListColumns() {
    const { BARCODE, STATUS, DISPLAY_SUMMARY, CALL_NUMBER } = RECEIVING_BOUND_ITEMS_COLUMN_LABELS;

    cy.expect(boundItemsList.has({ columns: [BARCODE, STATUS, DISPLAY_SUMMARY, CALL_NUMBER] }));
    cy.expect(
      boundItemsList
        .find(MultiColumnListCell({ column: BARCODE, row: 0 }))
        .find(Link())
        .exists(),
    );
  },

  assertBoundItemsPaginationControlsDisabled({ previous = true, next = true } = {}) {
    MultiColumnListHelper.assertPaginationControlsDisabled(boundItemsAccordion, { previous, next });
  },

  filterReceivedPiecesByOptions(optionLabels = []) {
    const actionsBtn = receivedSection.find(Button(COMMON_BUTTON_LABELS.ACTIONS));

    cy.do(actionsBtn.click());
    optionLabels.forEach((label) => {
      const checkbox = DropdownMenu().find(Checkbox(label));

      cy.do(checkbox.click());
      cy.expect(checkbox.has({ checked: true, disabled: false }));
    });
    cy.do(actionsBtn.click());
  },

  checkReceivedAccordionActionsMenuOptions(optionLabels = [], { shouldExist = true } = {}) {
    cy.do(receivedSection.find(Button(COMMON_BUTTON_LABELS.ACTIONS)).click());
    optionLabels.forEach((label) => {
      const option = DropdownMenu().find(Button(label));

      cy.expect(shouldExist ? option.exists() : option.absent());
    });
  },

  clickReceivedAccordionActionsMenuOption(optionLabel) {
    cy.do([
      receivedSection.find(Button(COMMON_BUTTON_LABELS.ACTIONS)).click(),
      DropdownMenu().find(Button(optionLabel)).click(),
    ]);
  },

  clickNextPageButtonInBoundItemsAccordion() {
    cy.do(boundItemsAccordion.find(Button(COMMON_BUTTON_LABELS.NEXT)).click());
  },

  clickPreviousPageButtonInBoundItemsAccordion() {
    cy.do(boundItemsAccordion.find(Button(COMMON_BUTTON_LABELS.PREVIOUS)).click());
  },

  clickBoundItemBarcodeLink(barcode) {
    cy.contains('#bound-items-list a', barcode)
      .invoke('removeAttr', 'target') // to open the link in the same tab
      .click();

    ItemRecordView.waitLoading();
  },
};
