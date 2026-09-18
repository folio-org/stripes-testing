import {
  AcqFundDistribution,
  Button,
  Callout,
  Checkbox,
  HTML,
  KeyValue,
  Popover,
  RepeatableField,
  RepeatableFieldItem,
  Section,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextArea,
  TextField,
  Warning,
  including,
  matching,
} from '../../../../interactors';
import {
  ACCOUNT_STATUSES,
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  ORDER_AND_ORDER_LINE_BUTTONS,
  ORDER_FORMAT_NAMES,
  POLINE_DETAILS_FIELDS,
} from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import AreYouSureModal from './modals/areYouSureModal';
import SelectInstanceModal from './modals/selectInstanceModal';
import SelectLocationModal from './modals/selectLocationModal';
import OrderStates from './orderStates';

const FORM_SECTION_IDS = {
  FORM: 'pane-poLineForm',
  ITEM_DETAILS: 'itemDetails',
  ORDER_LINE_DETAILS: 'lineDetails',
  VENDOR: 'vendor',
  ONGOING_ORDER: 'ongoingOrder',
  COST_DETAILS: 'costDetails',
  FUND_DISTRIBUTION: 'fundDistributionAccordion',
  LOCATION: 'location',
};
const FORM_FIELD_NAMES = {
  ACQUISITION_METHOD: 'acquisitionMethod',
  ORDER_FORMAT: 'orderFormat',
  RECEIPT_STATUS: 'receiptStatus',
  CHECKIN_ITEMS: 'checkinItems',
  PAYMENT_STATUS: 'paymentStatus',
  LOCATION_ID: 'locations[0].locationId',
  LOCATION_QUANTITY_PHYSICAL: 'locations[0].quantityPhysical',
  LOCATION_QUANTITY_ELECTRONIC: 'locations[0].quantityElectronic',
  USER_LIMIT: 'eresource.userLimit',
  EXCHANGE_RATE: 'cost.exchangeRate',
  CLAIMING_ACTIVE: 'claimingActive',
  CLAIMING_INTERVAL: 'claimingInterval',
  TITLE_OR_PACKAGE: 'titleOrPackage',
  RECEIVING_NOTE: 'details.receivingNote',
  SUBSCRIPTION_FROM: 'details.subscriptionFrom',
  SUBSCRIPTION_TO: 'details.subscriptionTo',
  RENEWAL_NOTE: 'renewalNote',
  MATERIAL_TYPE_ERESOURCE: 'eresource.materialType',
  MATERIAL_TYPE_PHYSICAL: 'physical.materialType',
  VENDOR_ACCOUNT: 'vendorDetail.vendorAccount',
  PUBLICATION_DATE: 'publicationDate',
  PUBLISHER: 'publisher',
  EDITION: 'edition',
  LIST_UNIT_PRICE: 'cost.listUnitPrice',
  LIST_UNIT_PRICE_ELECTRONIC: 'cost.listUnitPriceElectronic',
  QUANTITY_PHYSICAL: 'cost.quantityPhysical',
  QUANTITY_ELECTRONIC: 'cost.quantityElectronic',
  USE_SET_EXCHANGE_RATE: 'use-set-exchange-rate',
  CALCULATED_TOTAL_AMOUNT: 'Calculated total amount (Exchanged)',
};
const FUND_DISTRIBUTION_LABELS = {
  FUND_ID: 'Fund ID',
  EXPENSE_CLASS: 'Expense class',
};
const FORM_LABELS = {
  ADD_LOCATION: 'Add location',
  ADD_FUND_DISTRIBUTION: 'Add fund distribution',
  TITLE_LOOKUP: 'Title look-up',
  LOCATION_LOOKUP: 'Location look-up',
  FILTER_NAME_CODE: 'Name (code)',
  REQUIRED_FIELD_ERROR: 'Required!',
  AUTO_EXPORT_INFO_MESSAGE:
    'This is a Manual PO so all POLs are excluded from automated export workflows',
  REMOVE_FISCAL_YEAR: 'Remove fiscal year',
  SHOW_HIDDEN_FIELDS: 'Show hidden fields',
};
const FIELD_SELECTORS = {
  LOCATION_ID: 'field-locations',
  FUND_DISTRIBUTION_VALUE: 'fundDistribution',
  AUTOMATIC_EXPORT: 'automaticExport',
  INFO_POPOVER_TRIGGER: '[data-test-info-popover-trigger]',
  REMOVE_FISCAL_YEAR_BUTTON: 'button[icon="trash"][aria-label="Remove fiscal year"]',
  USER_LIMIT: '[name="eresource.userLimit"]',
  EXCHANGE_RATE: '[name="cost.exchangeRate"]',
  TEXT_FIELD_WRAPPER: '[class*="textField"]',
  ALERT: '[role="alert"]',
  COLUMN: '[class*="col-"]',
  FEEDBACK_ERROR: 'feedbackError',
  REPEATABLE_FIELD_LIST: '[data-test-repeatable-field-list]',
  FIELDSET: 'fieldset',
  LOCATION_ID_INPUT: 'field-locations[{index}].locationId',
  UNKNOWN_FIELD_ERROR: 'Unknown field: ',
};
const VALIDATION_MESSAGES = {
  INVALID_LOCATION_FUND: 'Location-restricted fund applied to invalid location',
};

const orderLineEditFormRoot = Section({ id: FORM_SECTION_IDS.FORM });
const itemDetailsSection = orderLineEditFormRoot.find(
  Section({ id: FORM_SECTION_IDS.ITEM_DETAILS }),
);
const orderLineDetailsSection = orderLineEditFormRoot.find(
  Section({ id: FORM_SECTION_IDS.ORDER_LINE_DETAILS }),
);
const vendorDetailsSection = orderLineEditFormRoot.find(Section({ id: FORM_SECTION_IDS.VENDOR }));
const ongoingOrderSection = orderLineEditFormRoot.find(
  Section({ id: FORM_SECTION_IDS.ONGOING_ORDER }),
);
const costDetailsSection = orderLineEditFormRoot.find(
  Section({ id: FORM_SECTION_IDS.COST_DETAILS }),
);
const fundDistributionDetailsSection = orderLineEditFormRoot.find(
  Section({ id: FORM_SECTION_IDS.FUND_DISTRIBUTION }),
);
const locationSection = orderLineEditFormRoot.find(Section({ id: FORM_SECTION_IDS.LOCATION }));
const automaticExportCheckboxName = FIELD_SELECTORS.AUTOMATIC_EXPORT;
const automaticExportInfoIconSelector = FIELD_SELECTORS.INFO_POPOVER_TRIGGER;
const cancelButton = Button(COMMON_BUTTON_LABELS.CANCEL);
const saveButton = Button(COMMON_BUTTON_LABELS.SAVE_AND_CLOSE);
const saveAndOpenOrderButton = Button(ORDER_AND_ORDER_LINE_BUTTONS.SAVE_AND_OPEN);
const saveAndKeepEditingButton = Button(COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING);
const saveAndCreateAnotherButton = Button(COMMON_BUTTON_LABELS.SAVE_AND_CREATE_ANOTHER);
const publicationDate = TextField({ name: FORM_FIELD_NAMES.PUBLICATION_DATE });
const publicher = TextField({ name: FORM_FIELD_NAMES.PUBLISHER });
const edition = TextField({ name: FORM_FIELD_NAMES.EDITION });

const itemDetailsFields = {
  title: itemDetailsSection.find(TextField({ name: FORM_FIELD_NAMES.TITLE_OR_PACKAGE })),
  receivingNote: itemDetailsSection.find(TextArea({ name: FORM_FIELD_NAMES.RECEIVING_NOTE })),
  subscriptionFrom: itemDetailsSection.find(
    TextField({ name: FORM_FIELD_NAMES.SUBSCRIPTION_FROM }),
  ),
  subscriptionTo: itemDetailsSection.find(TextField({ name: FORM_FIELD_NAMES.SUBSCRIPTION_TO })),
};

export const orderLineFields = {
  acquisitionMethod: orderLineDetailsSection.find(
    Selection({ name: FORM_FIELD_NAMES.ACQUISITION_METHOD }),
  ),
  orderFormat: orderLineDetailsSection.find(Select({ name: FORM_FIELD_NAMES.ORDER_FORMAT })),
  receiptStatus: orderLineDetailsSection.find(Select({ name: FORM_FIELD_NAMES.RECEIPT_STATUS })),
  checkinItems: orderLineDetailsSection.find(Select({ name: FORM_FIELD_NAMES.CHECKIN_ITEMS })),
  paymentStatus: orderLineDetailsSection.find(Select({ name: FORM_FIELD_NAMES.PAYMENT_STATUS })),
  claimingActive: orderLineDetailsSection.find(
    Checkbox({ name: FORM_FIELD_NAMES.CLAIMING_ACTIVE }),
  ),
  claimingInterval: orderLineDetailsSection.find(
    TextField({ name: FORM_FIELD_NAMES.CLAIMING_INTERVAL }),
  ),
};

export const vendorDetailsFields = {
  accountNumber: vendorDetailsSection.find(Select({ name: FORM_FIELD_NAMES.VENDOR_ACCOUNT })),
};

const ongoingInformationFields = {
  'Renewal note': ongoingOrderSection.find(TextArea({ name: FORM_FIELD_NAMES.RENEWAL_NOTE })),
};

const costDetailsFields = {
  physicalUnitPrice: costDetailsSection.find(TextField({ name: FORM_FIELD_NAMES.LIST_UNIT_PRICE })),
  electronicUnitPrice: costDetailsSection.find(
    TextField({ name: FORM_FIELD_NAMES.LIST_UNIT_PRICE_ELECTRONIC }),
  ),
  quantityPhysical: costDetailsSection.find(
    TextField({ name: FORM_FIELD_NAMES.QUANTITY_PHYSICAL }),
  ),
  quantityElectronic: costDetailsSection.find(
    TextField({ name: FORM_FIELD_NAMES.QUANTITY_ELECTRONIC }),
  ),
  useSetExchangeRate: costDetailsSection.find(
    Checkbox({ id: FORM_FIELD_NAMES.USE_SET_EXCHANGE_RATE }),
  ),
  exchangeRate: costDetailsSection.find(TextField({ name: FORM_FIELD_NAMES.EXCHANGE_RATE })),
  calculatedTotalAmount: costDetailsSection.find(
    KeyValue(FORM_FIELD_NAMES.CALCULATED_TOTAL_AMOUNT),
  ),
};

const fundDistributionFields = {
  expenseClass: (index = 0) => fundDistributionDetailsSection
    .find(RepeatableFieldItem({ index }))
    .find(Selection(including('Expense class'))),
};

const buttons = {
  [COMMON_BUTTON_LABELS.CANCEL]: cancelButton,
  [COMMON_BUTTON_LABELS.SAVE_AND_CLOSE]: saveButton,
  [ORDER_AND_ORDER_LINE_BUTTONS.SAVE_AND_OPEN]: saveAndOpenOrderButton,
  [COMMON_BUTTON_LABELS.SAVE_AND_KEEP_EDITING]: saveAndKeepEditingButton,
  [COMMON_BUTTON_LABELS.SAVE_AND_CREATE_ANOTHER]: saveAndCreateAnotherButton,
};
const requiredFields = [
  { fieldName: POLINE_DETAILS_FIELDS.ORDER_FORMAT, field: orderLineFields.orderFormat },
  { fieldName: POLINE_DETAILS_FIELDS.ACQUISITION_METHOD, field: orderLineFields.acquisitionMethod },
  { fieldName: POLINE_DETAILS_FIELDS.EXPENSE_CLASS, field: fundDistributionFields.expenseClass() },
];
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
  assertOngoingOrderSectionAbsent() {
    cy.expect(ongoingOrderSection.absent());
  },
  checkCostDetailsSection(fields = []) {
    this.checkFieldsConditions({ fields, section: costDetailsFields });
  },
  setUserLimit(limit) {
    cy.get(FIELD_SELECTORS.USER_LIMIT).clear().type(limit);
  },

  clickActionsButton: () => {
    cy.do(orderLineEditFormRoot.find(Button(COMMON_BUTTON_LABELS.ACTIONS)).click());
  },

  clickShowHiddenFieldsAction() {
    cy.do(Button(including(FORM_LABELS.SHOW_HIDDEN_FIELDS)).click());
  },

  checkExchangeRateError(
    errorMessage = OrderStates.exchangeRateAmountMustBePositive,
    shouldExist = true,
  ) {
    if (shouldExist) {
      cy.get(FIELD_SELECTORS.EXCHANGE_RATE)
        .closest(FIELD_SELECTORS.TEXT_FIELD_WRAPPER)
        .find(FIELD_SELECTORS.ALERT)
        .should('contain.text', errorMessage);
    } else {
      cy.get(FIELD_SELECTORS.EXCHANGE_RATE)
        .closest(FIELD_SELECTORS.TEXT_FIELD_WRAPPER)
        .find(FIELD_SELECTORS.ALERT)
        .should('not.contain.text', errorMessage);
    }
  },
  checkNotAvailableInstanceData(fields = []) {
    this.checkFieldsConditions({ fields, section: disabledButtons });
  },
  checkLocationDetailsSection({ rows = [] } = {}) {
    if (!rows.length) {
      cy.expect([
        locationSection.find(Selection({ name: FORM_FIELD_NAMES.LOCATION_ID })).exists(),
        locationSection
          .find(TextField({ name: FORM_FIELD_NAMES.LOCATION_QUANTITY_PHYSICAL }))
          .exists(),
        locationSection
          .find(TextField({ name: FORM_FIELD_NAMES.LOCATION_QUANTITY_ELECTRONIC }))
          .exists(),
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
    cy.do(itemDetailsSection.find(Button(FORM_LABELS.TITLE_LOOKUP)).click());
    SelectInstanceModal.waitLoading();

    return SelectInstanceModal;
  },
  clickLocationLookUpButton() {
    cy.do(locationSection.find(Button(FORM_LABELS.LOCATION_LOOKUP)).click());
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
      cy.do([
        orderLineDetailsSection.perform((el) => el.scrollIntoView()),
        Button({ name: FORM_FIELD_NAMES.ACQUISITION_METHOD }).click(),
        SelectionList().filter(poLineDetails.acquisitionMethod),
        SelectionOption(poLineDetails.acquisitionMethod).click(),
      ]);
    }
    if (poLineDetails.orderFormat) {
      cy.do(orderLineFields.orderFormat.choose(poLineDetails.orderFormat));
      cy.wait(1000);
    }
    if (poLineDetails.receivingWorkflow) {
      cy.do(
        Select({ name: FORM_FIELD_NAMES.CHECKIN_ITEMS }).choose(poLineDetails.receivingWorkflow),
      );
    }
    if (poLineDetails.materialType) {
      if (poLineDetails.orderFormat === ORDER_FORMAT_NAMES.ELECTRONIC_RESOURCE) {
        cy.do(
          Select({ name: FORM_FIELD_NAMES.MATERIAL_TYPE_ERERESOURCE }).choose(
            poLineDetails.materialType,
          ),
        );
      } else {
        cy.do(
          Select({ name: FORM_FIELD_NAMES.MATERIAL_TYPE_PHYSICAL }).choose(
            poLineDetails.materialType,
          ),
        );
      }
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
      if (costDetailsFields[key]) {
        cy.do(costDetailsFields[key].fillIn(value));
      }
    });
  },
  fillLocationDetails(locationDetails) {
    locationDetails.forEach((location, index) => {
      Object.entries(location).forEach(([key, value]) => {
        cy.wait(1500);
        cy.do(
          locationSection.find(TextField({ name: `locations[${index}].${key}` })).fillIn(value),
        );
      });
    });
  },
  searchLocationByName({ name, open = true, checkOptions = true }) {
    this.filterDropDownValue({ label: FORM_LABELS.FILTER_NAME_CODE, option: name, open });
    cy.wait(2000);

    if (checkOptions) {
      cy.then(() => SelectionList().optionList()).then((options) => {
        options.forEach((option) => cy.expect(option).to.include(name));
      });
    }
  },
  clickAddLocationButton() {
    cy.do(Button(FORM_LABELS.ADD_LOCATION).click());
  },

  clickAddFundDistributionButton() {
    cy.do([fundDistributionDetailsSection.find(Button(FORM_LABELS.ADD_FUND_DISTRIBUTION)).click()]);
  },

  scrollToFundDistributionSection() {
    cy.get(`[id="${FORM_SECTION_IDS.FUND_DISTRIBUTION}"]`).scrollIntoView().should('be.visible');
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

  selectFundDistributionDropDownValue(label, option, index = 0) {
    cy.wait(1000); // Wait for elements to be ready
    cy.do([
      fundDistributionDetailsSection
        .find(RepeatableFieldItem({ index }))
        .find(Selection(including(label)))
        .open(),
    ]);
    cy.wait(500); // Wait for dropdown to open
    cy.do([SelectionList().filter(option), SelectionList().select(including(option))]);
    cy.wait(500); // Wait for selection to complete
  },

  selectFundDistribution(fund, index) {
    this.selectFundDistributionDropDownValue(FUND_DISTRIBUTION_LABELS.FUND_ID, fund, index);
  },

  expandFundIdDropdown(index = 0) {
    cy.do(
      fundDistributionDetailsSection
        .find(RepeatableFieldItem({ index }))
        .find(Selection(including(FUND_DISTRIBUTION_LABELS.FUND_ID)))
        .open(),
    );
    cy.wait(1000);
  },
  expandExpenseClassDropdown(index = 0) {
    cy.do(fundDistributionFields.expenseClass(index).open());
    cy.wait(1000);
  },
  verifyFundInDropdown(fundName, fundCode, isPresent = true) {
    const fundOption = SelectionOption(`${fundName} (${fundCode})`);
    if (isPresent) {
      cy.expect(fundOption.exists());
    } else {
      cy.expect(fundOption.absent());
    }
  },

  selectFundFromOpenDropdown(fundName, fundCode) {
    const label = `${fundName} (${fundCode})`;

    cy.do([SelectionList().filter(label), SelectionOption(including(label)).click()]);
    cy.wait(1000);
  },

  expandLocationDropdown(index = 0) {
    cy.do(Button({ id: FIELD_SELECTORS.LOCATION_ID_INPUT.replace('{index}', index) }).click());
    cy.wait(1000);
  },

  checkLocationDropdownOptions(expectedLocations) {
    cy.then(() => SelectionList().optionList()).then((actualOptions) => {
      expect(actualOptions.sort()).to.deep.equal(
        expectedLocations.sort(),
        `Expected locations: ${JSON.stringify(expectedLocations)}, but got: ${JSON.stringify(actualOptions)}`,
      );
    });
  },

  selectLocationFromDropdown(locationName) {
    cy.do(SelectionOption(including(locationName)).click());
    cy.wait(1000);
  },

  checkIsLocationRequired(shouldHaveWarning = true) {
    if (shouldHaveWarning) {
      cy.expect(locationSection.has({ error: OrderStates.locationRequired }));
    } else {
      cy.expect(
        locationSection
          .find(HTML({ className: including(FIELD_SELECTORS.FEEDBACK_ERROR) }))
          .absent(),
      );
    }
  },

  checkPercentageAmountIsEqualTo100(shouldHaveWarning = true) {
    if (shouldHaveWarning) {
      cy.expect(
        fundDistributionDetailsSection.has({ error: OrderStates.percentageAmountShouldBeEqual }),
      );
    } else {
      cy.expect(
        fundDistributionDetailsSection
          .find(HTML({ className: including(FIELD_SELECTORS.FEEDBACK_ERROR) }))
          .absent(),
      );
    }
  },

  assertFundDistributionSectionEmpty() {
    cy.expect(fundDistributionDetailsSection.find(AcqFundDistribution()).has({ rowCount: 0 }));
  },

  checkRemainingAmountToBeDistributed(remainingAmount) {
    cy.expect(
      fundDistributionDetailsSection
        .find(RepeatableField(OrderStates.remainingAmountToBeDistributed(remainingAmount)))
        .exists(),
    );
  },

  selectExpenseClass(expenseClass, index) {
    this.selectFundDistributionDropDownValue(
      FUND_DISTRIBUTION_LABELS.EXPENSE_CLASS,
      expenseClass,
      index,
    );
  },

  setFundDistributionValue(value, index) {
    // Use cy.get().type() to allow entering decimals; .fillIn() only works with integers
    cy.get(`[name="${FIELD_SELECTORS.FUND_DISTRIBUTION_VALUE}[${index}].value"]`).type(
      '{selectall}{backspace}',
      {
        delay: 50,
      },
    );
    cy.get(`[name="${FIELD_SELECTORS.FUND_DISTRIBUTION_VALUE}[${index}].value"]`)
      .type(value, { delay: 100 })
      .blur();
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
  assertFormClosed() {
    cy.expect(orderLineEditFormRoot.absent());
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

  cancelWithUnsavedChanges({ keepEditing = false } = {}) {
    this.clickCancelButton(true);
    AreYouSureModal.verifyAreYouSureForm(true);

    if (keepEditing) {
      AreYouSureModal.clickKeepEditingButton();
      cy.expect(orderLineEditFormRoot.exists());
    } else {
      AreYouSureModal.clickCloseWithoutSavingButton();
      AreYouSureModal.verifyAreYouSureForm(false);
      cy.expect(orderLineEditFormRoot.absent());
    }
  },
  clickSaveAndKeepEditingButton({ isSaved = true, orderLineCreated = false } = {}) {
    cy.expect(saveAndKeepEditingButton.has({ disabled: false }));
    cy.do(saveAndKeepEditingButton.click());
    this.waitLoading();

    if (isSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(
          new RegExp(
            orderLineCreated
              ? OrderStates.orderLineCreatedSuccessfully
              : OrderStates.orderLineUpdatedSuccessfully,
          ),
        ),
      );
    }
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
    cy.do(Button(COMMON_BUTTON_LABELS.CONFIRM).click());
  },
  verifyOrderLineEditFormClosed() {
    cy.expect(orderLineEditFormRoot.absent());
  },

  checkSelectOptions(selectField, expectedOptions) {
    cy.do(selectField.focus());
    cy.expect(selectField.has({ optionsText: expectedOptions }));
  },
  verifyAutomaticExportCheckboxDisabled() {
    cy.expect(
      orderLineDetailsSection
        .find(Checkbox({ name: automaticExportCheckboxName }))
        .has({ disabled: true }),
    );
  },
  clickAutomaticExportInfoIcon() {
    cy.get(`[name="${automaticExportCheckboxName}"]`).then(($checkbox) => {
      cy.wrap($checkbox)
        .closest(FIELD_SELECTORS.COLUMN)
        .find(automaticExportInfoIconSelector)
        .first()
        .click();
    });
  },
  verifyAutomaticExportInfoPopover() {
    cy.expect(
      Popover().has({
        content: including(FORM_LABELS.AUTO_EXPORT_INFO_MESSAGE),
      }),
    );
  },

  checkButtonsNotDisplayed(buttonsNotDisplayed = []) {
    buttonsNotDisplayed.forEach((label) => {
      cy.expect(buttons[label].absent());
    });
  },

  checkRequiredFields(fields = []) {
    fields.forEach((field) => {
      const requiredFieldsConfig = requiredFields.find((f) => f.fieldName === field);
      if (!requiredFieldsConfig) throw new Error(`${FIELD_SELECTORS.UNKNOWN_FIELD_ERROR}${field}`);
      cy.expect(requiredFieldsConfig.field.has({ error: FORM_LABELS.REQUIRED_FIELD_ERROR }));
    });
  },

  checkAccountNumberWarning(shouldHaveWarning = true) {
    if (shouldHaveWarning) {
      cy.expect(vendorDetailsSection.find(Warning()).has({ message: OrderStates.inactiveAccount }));
    } else {
      cy.expect(vendorDetailsSection.find(Warning()).absent());
    }
  },

  checkAccountNumberMarkedInactive() {
    cy.expect(
      vendorDetailsFields.accountNumber.has({
        checkedOptionText: including(ACCOUNT_STATUSES.INACTIVE),
      }),
    );
  },

  checkAccountNumberSelected(value) {
    cy.expect(vendorDetailsFields.accountNumber.has({ checkedOptionText: including(value) }));
  },

  removeLocationByIndex(index = 0) {
    cy.do(
      locationSection
        .find(RepeatableFieldItem({ index }))
        .find(Button({ icon: 'trash' }))
        .click(),
    );
  },

  checkFundDistributionFundSelected({ fund, index = 0 }) {
    cy.expect(
      fundDistributionDetailsSection
        .find(RepeatableFieldItem({ index }))
        .find(Selection(including(FUND_DISTRIBUTION_LABELS.FUND_ID)))
        .has({ value: including(fund) }),
    );
  },

  checkLocationSelected({ location, index = 0 }) {
    cy.expect([
      locationSection
        .find(RepeatableFieldItem({ index }))
        .find(Selection(including(FORM_LABELS.FILTER_NAME_CODE)))
        .has({ value: including(location) }),
      locationSection
        .find(RepeatableFieldItem({ index }))
        .find(Button({ icon: 'trash' }))
        .exists(),
    ]);
  },

  checkFundRestrictionErrorToastPresent() {
    cy.expect(Callout(including(VALIDATION_MESSAGES.INVALID_LOCATION_FUND)).exists());
  },

  checkFundRestrictionErrorToastAbsent() {
    cy.expect(Callout(including(VALIDATION_MESSAGES.INVALID_LOCATION_FUND)).absent());
  },

  selectBlankAccountNumber() {
    cy.do(vendorDetailsFields.accountNumber.choose(''));
  },

  checkAccountNumberIsBlank() {
    cy.expect(vendorDetailsFields.accountNumber.has({ checkedOptionText: ' ' }));
  },
};
