import {
  Button,
  Section,
  KeyValue,
  including,
  MultiColumnListCell,
  Link,
  PaneHeader,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InventoryInstance from '../inventory/inventoryInstance';
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
      cy.get('#information').within(() => {
        cy.contains('Acquisition units').parent().should('not.contain', acquisitionUnitName);
      });
    }
  },
  checkExpectedTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.copyNumber) {
        cy.expect(
          expectedSection
            .find(MultiColumnListCell({ row: index, column: 'Copy number' }))
            .has({ content: including(record.copyNumber) }),
        );
      }
      if (record.format) {
        cy.expect(
          expectedSection
            .find(MultiColumnListCell({ row: index, column: 'Piece format' }))
            .has({ content: including(record.format) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(expectedSection.has({ text: including('The list contains no items') }));
    }
  },
  checkReceivedTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.barcode) {
        cy.expect(
          receivedSection
            .find(MultiColumnListCell({ row: index, column: 'Barcode' }))
            .has({ content: including(record.barcode) }),
        );
      }
      if (record.format) {
        cy.expect(
          receivedSection
            .find(MultiColumnListCell({ row: index, column: 'Piece format' }))
            .has({ content: including(record.format) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(receivedSection.has({ text: including('The list contains no items') }));
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

  verifyEditButtonIsInactive() {
    // Check that Edit button exists and is disabled, regardless of visibility
    cy.get('button').contains('Edit').should('be.disabled');
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
};
