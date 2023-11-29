import {
  Button,
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
  Modal,
  HTML,
} from '../../../../interactors';
import OrderStates from './orderStates';
import InteractorsTools from '../../utils/interactorsTools';

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
const keepEditingBtn = Button('Keep editing');
const areYouSureForm = Modal('Are you sure?');
const cancelButton = Button('Cancel');
const saveButton = Button('Save & close');
const saveAndOpenOrderButtom = Button('Save & open order');
const closeWithoutSavingButton = Button('Close without saving');

const itemDetailsFields = {
  title: itemDetailsSection.find(TextField({ name: 'titleOrPackage' })),
  receivingNote: itemDetailsSection.find(TextArea({ name: 'details.receivingNote' })),
};

const orderLineFields = {
  orderFormat: orderLineDetailsSection.find(Select({ name: 'orderFormat' })),
  receiptStatus: orderLineDetailsSection.find(Select({ name: 'receiptStatus' })),
  paymentStatus: orderLineDetailsSection.find(Select({ name: 'paymentStatus' })),
};

const vendorDetailsFields = {
  accountNumber: vendorDetailsSection.find(Select({ name: 'vendorDetail.vendorAccount' })),
};

const ongoingInformationFields = {
  'Renewal note': ongoingOrderSection.find(TextArea({ name: 'renewalNote' })),
};

const costDetailsFields = {
  physicalUnitPrice: costDetailsSection.find(TextField({ name: 'cost.listUnitPrice' })),
  quantityPhysical: costDetailsSection.find(TextField({ name: 'cost.quantityPhysical' })),
};

const buttons = {
  Cancel: cancelButton,
  'Save & close': saveButton,
  'Save & open order': saveAndOpenOrderButtom,
};

export default {
  waitLoading() {
    cy.expect(orderLineEditFormRoot.exists());
    cy.expect(cancelButton.exists());
    cy.expect(saveButton.exists());
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
  checkOngoingOrderInformationSection(fields = []) {
    this.checkFieldsConditions({ fields, section: ongoingInformationFields });
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
  addFundDistribution() {
    cy.do(Button('Add fund distribution').click());
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
  selectDropDownValue(label, option) {
    cy.do([
      Selection(including(label)).open(),
      SelectionList().filter(option),
      SelectionList().select(including(option)),
    ]);
  },
  selectFundDistribution(fund) {
    this.selectDropDownValue('Fund ID', fund);
  },
  selectExpenseClass(expenseClass) {
    this.selectDropDownValue('Expense class', expenseClass);
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
    if (shouldModalExsist) {
      cy.do(cancelButton.click());
    } else {
      cy.do(cancelButton.click());
      cy.expect(orderLineEditFormRoot.absent());
    }
  },
  clickSaveButton({ orderLineCreated = false, orderLineUpdated = true } = {}) {
    cy.expect(saveButton.has({ disabled: false }));
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
    cy.expect(saveAndOpenOrderButtom.has({ disabled: false }));
    cy.do(saveAndOpenOrderButtom.click());

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
  clickCloseWithoutSavingButton() {
    cy.do(areYouSureForm.find(closeWithoutSavingButton).click());
  },
  checkAreYouSureModalIsClosed() {
    cy.expect(areYouSureForm.absent());
  },
  verifyAreYouSureForm() {
    cy.expect([
      areYouSureForm.find(HTML(including('There are unsaved changes'))).exists(),
      areYouSureForm.find(keepEditingBtn).exists(),
      areYouSureForm.find(closeWithoutSavingButton).exists(),
    ]);
  },
};
