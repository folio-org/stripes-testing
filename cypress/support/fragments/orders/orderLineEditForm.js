import {
  Button,
  Checkbox,
  KeyValue,
  RepeatableFieldItem,
  Section,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextArea,
  TextField,
  including,
  matching,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import SelectInstanceModal from './modals/selectInstanceModal';
import SelectLocationModal from './modals/selectLocationModal';
import OrderStates from './orderStates';

const orderLineEditFormRoot = Section({ id: 'pane-poLineForm' });
const itemDetailsSection = orderLineEditFormRoot.find(Section({ id: 'itemDetails' }));
const orderLineDetailsSection = orderLineEditFormRoot.find(Section({ id: 'lineDetails' }));
const vendorDetailsSection = orderLineEditFormRoot.find(Section({ id: 'vendor' }));
const ongoingOrderSection = orderLineEditFormRoot.find(Section({ id: 'ongoingOrder' }));
const costDetailsSection = orderLineEditFormRoot.find(Section({ id: 'costDetails' }));
const fundDistributionDetailsSection = orderLineEditFormRoot.find(
  Section({ id: 'fundDistributionAccordion' }),
);
const locationSection = orderLineEditFormRoot.find(Section({ id: 'location' }));
const cancelButton = Button('Cancel');
const saveButton = Button('Save & close');
const saveAndOpenOrderButton = Button('Save & open order');
const publicationDate = TextField({ name: 'publicationDate' });
const publicher = TextField({ name: 'publisher' });
const edition = TextField({ name: 'edition' });

const itemDetailsFields = {
  title: itemDetailsSection.find(TextField({ name: 'titleOrPackage' })),
  receivingNote: itemDetailsSection.find(TextArea({ name: 'details.receivingNote' })),
  subscriptionFrom: itemDetailsSection.find(TextField({ name: 'details.subscriptionFrom' })),
  subscriptionTo: itemDetailsSection.find(TextField({ name: 'details.subscriptionTo' })),
};

const orderLineFields = {
  orderFormat: orderLineDetailsSection.find(Select({ name: 'orderFormat' })),
  receiptStatus: orderLineDetailsSection.find(Select({ name: 'receiptStatus' })),
  paymentStatus: orderLineDetailsSection.find(Select({ name: 'paymentStatus' })),
  claimingActive: orderLineDetailsSection.find(Checkbox({ name: 'claimingActive' })),
  claimingInterval: orderLineDetailsSection.find(TextField({ name: 'claimingInterval' })),
};

export const vendorDetailsFields = {
  accountNumber: vendorDetailsSection.find(Select({ name: 'vendorDetail.vendorAccount' })),
};

const ongoingInformationFields = {
  'Renewal note': ongoingOrderSection.find(TextArea({ name: 'renewalNote' })),
};

const costDetailsFields = {
  physicalUnitPrice: costDetailsSection.find(TextField({ name: 'cost.listUnitPrice' })),
  quantityPhysical: costDetailsSection.find(TextField({ name: 'cost.quantityPhysical' })),
  useSetExchangeRate: costDetailsSection.find(Checkbox({ id: 'use-set-exchange-rate' })),
  exchangeRate: costDetailsSection.find(TextField({ name: 'cost.exchangeRate' })),
  calculatedTotalAmount: costDetailsSection.find(KeyValue('Calculated total amount (Exchanged)')),
};

const buttons = {
  Cancel: cancelButton,
  'Save & close': saveButton,
  'Save & open order': saveAndOpenOrderButton,
};
const disabledButtons = {
  Title: itemDetailsFields.title,
  'Publication date': publicationDate,
  Publisher: publicher,
  Edition: edition,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(orderLineEditFormRoot.exists());
  },
  checkButtonsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(buttons[label].has(conditions));
    });
  },
  checkFieldsConditions({ fields, section }) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(section[label].has(conditions));
    });
  },
  checkItemDetailsSection(fields = []) {
    this.checkFieldsConditions({ fields, section: itemDetailsFields });
  },
  checkOrderLineDetailsSection(fields = []) {
    this.checkFieldsConditions({ fields, section: orderLineFields });
  },
  checkOngoingOrderInformationSection(fields = []) {
    this.checkFieldsConditions({ fields, section: ongoingInformationFields });
  },
  checkCostDetailsSection(fields = []) {
    this.checkFieldsConditions({ fields, section: costDetailsFields });
  },
  checkNotAvailableInstanceData(fields = []) {
    this.checkFieldsConditions({ fields, section: disabledButtons });
  },
  checkLocationDetailsSection({ rows = [] } = {}) {
    if (!rows.length) {
      cy.expect([
        locationSection.find(Selection({ name: 'locations[0].locationId' })).exists(),
        locationSection.find(TextField({ name: 'locations[0].quantityPhysical' })).exists(),
        locationSection.find(TextField({ name: 'locations[0].quantityElectronic' })).exists(),
      ]);
    }
  },
  fillOrderLineFields(orderLine) {
    if (orderLine.itemDetails) {
      this.fillItemDetails(orderLine.itemDetails);
    }
    if (orderLine.poLineDetails) {
      this.fillPoLineDetails(orderLine.poLineDetails);
    }
    if (orderLine.ongoingOrder) {
      this.fillOngoingOrderInformation(orderLine.ongoingOrder);
    }
    if (orderLine.vendorDetails) {
      this.fillVendorDetails(orderLine.vendorDetails);
    }
    if (orderLine.costDetails) {
      this.fillCostDetails(orderLine.costDetails);
    }
    if (orderLine.locationDetails) {
      this.fillLocationDetails(orderLine.locationDetails);
    }
    if (orderLine.receiptStatus) {
      cy.do(orderLineFields.receiptStatus.choose(orderLine.receiptStatus));
    }
    if (orderLine.paymentStatus) {
      cy.do(orderLineFields.paymentStatus.choose(orderLine.paymentStatus));
    }
  },
  clickTitleLookUpButton() {
    cy.do(itemDetailsSection.find(Button('Title look-up')).click());
    SelectInstanceModal.waitLoading();

    return SelectInstanceModal;
  },
  clickLocationLookUpButton() {
    cy.do(locationSection.find(Button('Location look-up')).click());
    SelectLocationModal.waitLoading();
    SelectLocationModal.verifyModalView();

    return SelectLocationModal;
  },
  fillItemDetailsTitle({ instanceTitle }) {
    this.clickTitleLookUpButton();
    SelectInstanceModal.searchByName(instanceTitle);
    SelectInstanceModal.selectInstance(instanceTitle);
  },
  fillItemDetails(itemDetails) {
    Object.entries(itemDetails).forEach(([key, value]) => {
      cy.do(itemDetailsFields[key].fillIn(value));
    });
  },
  fillPoLineDetails(poLineDetails) {
    if (poLineDetails.acquisitionMethod) {
      cy.do(Button({ name: 'acquisitionMethod' }).click());
      cy.do(SelectionOption(poLineDetails.acquisitionMethod).click());
    }
    if (poLineDetails.orderFormat) {
      cy.do(orderLineFields.orderFormat.choose(poLineDetails.orderFormat));
    }
    if (poLineDetails.claimingActive) {
      cy.do(orderLineFields.claimingActive.click());
    }
    if (poLineDetails.claimingInterval) {
      cy.do(orderLineFields.claimingInterval.fillIn(poLineDetails.claimingInterval));
      cy.do(orderLineFields.claimingInterval.has({ value: poLineDetails.claimingInterval }));
    }
  },
  fillOngoingOrderInformation({ renewalNote }) {
    if (renewalNote) {
      cy.do(ongoingInformationFields['Renewal note'].fillIn(renewalNote));
    }
  },
  fillVendorDetails(vendorDetails) {
    if (vendorDetails.accountNumber) {
      cy.do(vendorDetailsFields.accountNumber.choose(including(vendorDetails.accountNumber)));
    }
  },
  fillCostDetails(costDetails) {
    Object.entries(costDetails).forEach(([key, value]) => {
      cy.do(costDetailsFields[key].fillIn(value));
    });
  },
  fillLocationDetails(locationDetails) {
    locationDetails.forEach((location, index) => {
      Object.entries(location).forEach(([key, value]) => {
        cy.do(
          locationSection.find(TextField({ name: `locations[${index}].${key}` })).fillIn(value),
        );
      });
    });
  },
  searchLocationByName({ name, open = true, checkOptions = true }) {
    this.filterDropDownValue({ label: 'Name (code)', option: name, open });
    cy.wait(2000);

    if (checkOptions) {
      cy.then(() => SelectionList().optionList()).then((options) => {
        options.forEach((option) => cy.expect(option).to.include(name));
      });
    }
  },
  clickAddLocationButton() {
    cy.do(Button('Add location').click());
  },
  clickAddFundDistributionButton() {
    cy.do(Button('Add fund distribution').click());
  },
  scrollToFundDistributionSection() {
    cy.get('[id="fundDistributionAccordion"]').scrollIntoView().should('be.visible');
    cy.wait(1000);
  },
  addFundDistribution({ fund, index, amount }) {
    this.clickAddFundDistributionButton();
    this.selectFundDistribution(fund, index);
    this.setFundDistributionValue(amount, index);
    cy.wait(2000);
  },
  updateFundDistribution({ fund, index }) {
    this.scrollToFundDistributionSection();
    this.selectFundDistribution(fund, index);
  },
  deleteFundDistribution({ index = 0 } = {}) {
    cy.do(
      fundDistributionDetailsSection
        .find(RepeatableFieldItem({ index }))
        .find(Button({ icon: 'trash' }))
        .click(),
    );
    cy.wait(2000);
  },
  filterDropDownValue({ label, option, open = true, index = 0 } = {}) {
    if (open) {
      cy.do(
        RepeatableFieldItem({ index })
          .find(Selection(including(label)))
          .open(),
      );
    }

    cy.do(SelectionList().filter(option));
  },
  selectDropDownValue(label, option, index = 0) {
    cy.wait(1000); // Wait for elements to be ready
    cy.do([
      RepeatableFieldItem({ index })
        .find(Selection(including(label)))
        .open(),
    ]);
    cy.wait(500); // Wait for dropdown to open
    cy.do([SelectionList().filter(option), SelectionList().select(including(option))]);
    cy.wait(500); // Wait for selection to complete
  },
  selectFundDistribution(fund, index) {
    this.selectDropDownValue('Fund ID', fund, index);
  },
  selectExpenseClass(expenseClass, index) {
    this.selectDropDownValue('Expense class', expenseClass, index);
  },
  setFundDistributionValue(value, index) {
    cy.do(
      RepeatableFieldItem({ index })
        .find(TextField({ label: including('Value') }))
        .fillIn(value),
    );
  },
  checkValidatorError({ locationDetails } = {}) {
    if (locationDetails) {
      cy.expect(
        locationSection
          .find(TextField({ label: including(locationDetails.label) }))
          .has({ error: locationDetails.error }),
      );
    }
  },
  clickCancelButton(shouldModalExsist = false) {
    cy.wait(20000);
    cy.expect(cancelButton.has({ disabled: false }));
    cy.do(cancelButton.click());

    if (!shouldModalExsist) {
      cy.expect(orderLineEditFormRoot.absent());
    }
  },
  clickSaveButton({ orderLineCreated = false, orderLineUpdated = true } = {}) {
    cy.expect(saveButton.has({ disabled: false }));
    cy.wait(3000);
    cy.do(saveButton.click());

    if (orderLineCreated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.orderLineCreatedSuccessfully)),
      );
    }
    if (orderLineUpdated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.orderLineUpdatedSuccessfully)),
      );
    }
    // wait for changes to be applied
    cy.wait(2000);
  },
  clickSaveAndOpenOrderButton({ orderOpened = true, orderLineCreated = true } = {}) {
    cy.expect(saveAndOpenOrderButton.has({ disabled: false }));
    cy.do(saveAndOpenOrderButton.click());

    if (orderOpened) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.orderOpenedSuccessfully)),
      );
    }

    if (orderLineCreated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(OrderStates.orderLineCreatedSuccessfully)),
      );
    }

    // wait for changes to be applied
    cy.wait(2000);
  },
  clickConfirmButton() {
    cy.do(Button('Confirm').click());
  },
  verifyOrderLineEditFormClosed() {
    cy.expect(orderLineEditFormRoot.absent());
  },

  checkSelectOptions(selectField, expectedOptions) {
    cy.do(selectField.focus());
    cy.expect(selectField.has({ optionsText: expectedOptions }));
  },
};
