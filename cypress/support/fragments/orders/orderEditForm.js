import {
  Button,
  Checkbox,
  MultiSelect,
  Section,
  Select,
  Selection,
  SelectionList,
  TextField,
  including,
  matching,
  KeyValue,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import SearchHelper from '../finance/financeHelper';
import OrderStates from './orderStates';

const orderEditFormRoot = Section({ id: 'pane-poForm' });

const orderInfoSection = orderEditFormRoot.find(Section({ id: 'purchaseOrder' }));
const ongoingInformationSection = orderEditFormRoot.find(Section({ id: 'ongoing' }));
const orderSummarySection = orderEditFormRoot.find(Section({ id: 'poSummary' }));

const collapseAllButton = orderEditFormRoot.find(Button('Collapse all'));
const cancelButton = orderEditFormRoot.find(Button('Cancel'));
const saveAndCloseButton = orderEditFormRoot.find(Button('Save & close'));
const addPoLineButton = orderEditFormRoot.find(Button('Add POL'));

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

const ongoingInformationFields = {
  subscription: ongoingInformationSection.find(Checkbox({ name: 'ongoing.isSubscription' })),
  renewalDate: ongoingInformationSection.find(TextField({ name: 'ongoing.renewalDate' })),
};

const sections = {
  'Purchase order': orderInfoSection,
  'PO summary': orderSummarySection,
};

const buttons = {
  Cancel: cancelButton,
  'Save & close': saveAndCloseButton,
  'Add POL': addPoLineButton,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
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
  checkFieldsConditions({ fields, section }) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(section[label].has(conditions));
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
      cy.get('[data-test-po-number="true"]').should('exist'),
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
  checkOngoingOrderInformationSection(fields = []) {
    this.checkFieldsConditions({ fields, section: ongoingInformationFields });
  },
  getOrderNumber() {
    return cy.then(() => infoSectionFields.poNumber.value());
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
      cy.do(infoSectionFields.orderType.choose(orderType));
    }
  },
  fillOngoingInformationSectionFields({ renewalDate }) {
    if (renewalDate) {
      cy.do(ongoingInformationFields.renewalDate.fillIn(renewalDate));
      cy.expect(ongoingInformationFields.renewalDate.has({ value: renewalDate }));
    }
  },
  selectOrderTemplate(templateName) {
    this.selectDropDownValue('Template name', templateName);
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
  clickAddPolButton({ orderSaved = true } = {}) {
    this.clickCreateOrder({ button: addPoLineButton, orderSaved });
  },
  clickSaveButton({ orderSaved = true } = {}) {
    this.clickCreateOrder({ button: saveAndCloseButton, orderSaved });
  },
  clickCreateOrder({ button, orderSaved }) {
    cy.expect(button.has({ disabled: false }));
    cy.do(button.click());

    if (orderSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.orderSavedSuccessfully)),
      );
    }
    // wait for changes to be applied
    cy.wait(2000);
  },
};
