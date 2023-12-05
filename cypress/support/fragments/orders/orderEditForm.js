import {
  Button,
  KeyValue,
  MultiSelect,
  Section,
  Select,
  Selection,
  SelectionList,
  TextField,
  Select,
  including,
  matching,
} from '../../../../interactors';
import OrderStates from './orderStates';
import SearchHelper from '../finance/financeHelper';
import InteractorsTools from '../../utils/interactorsTools';

const orderEditFormRoot = Section({ id: 'pane-poForm' });

const orderInfoSection = orderEditFormRoot.find(Section({ id: 'purchaseOrder' }));
const orderSummarySection = orderEditFormRoot.find(Section({ id: 'poSummary' }));

const collapseAllButton = Button('Collapse all');
const cancelButton = Button('Cancel');
const saveButton = Button({ id: 'clickable-create-new-purchase-order' });
const orderTypeField = Select('Order type*');

const infoSectionFields = {
  poNumberPrefix: orderInfoSection.find(Select({ name: 'poNumberPrefix' })),
  poNumberSuffix: orderInfoSection.find(Select({ name: 'poNumberSuffix' })),
  poNumber: orderInfoSection.find(KeyValue('PO number')),
  vendor: orderInfoSection.find(TextField({ name: 'vendor', disabled: true })),
  orderType: orderInfoSection.find(Select({ name: 'orderType' })),
  acquisitionUnit: orderInfoSection.find(MultiSelect({ id: 'order-acq-units' })),
  assignedTo: orderInfoSection.find(TextField({ name: 'assignedTo', disabled: true })),
  billTo: orderInfoSection.find(Selection('Bill to')),
  shipTo: orderInfoSection.find(Selection('Ship to')),
  tags: orderInfoSection.find(MultiSelect({ label: 'Tags' })),
};

const sections = {
  'Purchase order': orderInfoSection,
  'PO summary': orderSummarySection,
};

const buttons = {
  Cancel: cancelButton,
  'Save & close': saveButton,
};

export default {
  waitLoading() {
    cy.expect(orderEditFormRoot.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  checkSectionsConditions(areas = []) {
    areas.forEach(({ sectionName, conditions }) => {
      cy.expect(sections[sectionName].has(conditions));
    });
  },
  checkOrderFormContent() {
    this.checkInfoSectionFields();

    Object.values(sections).forEach((section) => {
      cy.expect(section.exists());
    });
  },
  checkInfoSectionFields() {
    cy.expect([
      infoSectionFields.poNumberPrefix.has({ required: false }),
      infoSectionFields.poNumberSuffix.has({ required: false }),
      infoSectionFields.poNumber.exists(),
      infoSectionFields.vendor.has({ required: true }),
      infoSectionFields.orderType.has({ required: true }),
      infoSectionFields.acquisitionUnit.exists(),
      infoSectionFields.assignedTo.has({ required: false }),
      infoSectionFields.billTo.exists(),
      infoSectionFields.shipTo.exists(),
      infoSectionFields.tags.exists(),
    ]);
  },
  checkValidationError({ orderType } = {}) {
    if (orderType) {
      cy.expect(infoSectionFields.orderType.has({ error: 'Required!' }));
    }
  },
  fillOrderFields({ orderInfo }) {
    if (orderInfo) {
      this.fillOrderInfoSectionFields(orderInfo);
    }
  },
  fillOrderInfoSectionFields({ organizationName, orderType }) {
    if (organizationName) {
      this.selectVendorByName(organizationName);
    }

    if (orderType) {
      cy.do(orderInfoSection.orderType.choose(orderType));
    }
  },
  selectOrderTemplate(templateName) {
    this.selectDropDownValue('Template name', templateName);
  },
  selectOrderType(type) {
    cy.do(orderTypeField.choose(type));
  },
  selectDropDownValue(label, option) {
    cy.do([
      Selection(including(label)).open(),
      SelectionList().filter(option),
      SelectionList().select(including(option)),
    ]);
  },
  selectVendorByName(organizationName) {
    cy.do(orderInfoSection.find(Button('Organization look-up')).click());
    SearchHelper.searchByName(organizationName);
    SearchHelper.selectFromResultsList();
  },
  cliskCollapseAllButton() {
    cy.do(collapseAllButton.click());
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(orderEditFormRoot.absent());
  },
  clickSaveButton({ orderSaved = true } = {}) {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());

    if (orderSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.orderSavedSuccessfully)),
      );
    }
    // wait for changes to be applied
    cy.wait(2000);
  },
};
