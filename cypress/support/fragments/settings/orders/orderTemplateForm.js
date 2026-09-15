import {
  Accordion,
  AcqFundDistribution,
  Button,
  Card,
  Checkbox,
  Form,
  Popover,
  including,
  RepeatableFieldItem,
  Section,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextArea,
  TextField,
} from '../../../../../interactors';
import OrderStates from '../../orders/orderStates';
import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  ORDER_LINE_FORM_LABELS,
} from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import SearchHelper from '../../finance/financeHelper';

const LOCATION_FIELD_ID_PREFIX = 'field-locations';

const PAYMENT_TERMS_LABELS = {
  STARTING_FISCAL_YEAR: 'Starting fiscal year',
  ADD_FISCAL_YEAR: 'Add fiscal year',
};

const orderTemplateForm = Form({ id: 'order-template-form' });
const orderTemplateInfoSection = orderTemplateForm.find(Section({ id: 'templateInfo' }));
const orderTemplatePoInfoSection = orderTemplateForm.find(Section({ id: 'poInfo' }));
const orderTemplateOngoingSection = orderTemplateForm.find(Section({ id: 'ongoing' }));
const orderTemplatePoNotesSection = orderTemplateForm.find(Section({ id: 'poNotes' }));
const orderTemplatePoTagsSection = orderTemplateForm.find(Section({ id: 'poTags' }));
const orderTemplatePoSummarySection = orderTemplateForm.find(Section({ id: 'poSummary' }));
const orderTemplateItemDetailsSection = orderTemplateForm.find(Section({ id: 'itemDetails' }));
const orderTemplateLineDetailsSection = orderTemplateForm.find(Section({ id: 'lineDetails' }));
const orderTemplateDonorSection = orderTemplateForm.find(Section({ id: 'donorsInformation' }));
const orderTemplatePOLOngoingSection = orderTemplateForm.find(Section({ id: 'polOngoingOrder' }));
const orderTemplateVendorDetailsSection = orderTemplateForm.find(
  Section({ id: 'accordion-vendor' }),
);
const orderTemplateCostDetailsSection = orderTemplateForm.find(Section({ id: 'costDetails' }));
const orderTemplateFundDetailsSection = orderTemplateForm.find(
  Section({ id: 'fundDistributionAccordion' }),
);
const orderTemplateLocationDetailsSection = orderTemplateForm.find(Section({ id: 'location' }));
const orderTemplatePoLineTagsSection = orderTemplateForm.find(Section({ id: 'polTags' }));

const orderTemplatePaymentTermsSection = Accordion({ id: 'paymentTerms' });

const orderTemplateMultiYearPrepaymentCheckbox = orderTemplatePOLOngoingSection.find(
  Checkbox({ name: 'multiYearPayment' }),
);

// Info popover trigger ("i" icon) selector used across the acq forms
const infoPopoverTriggerSelector = '[data-test-info-popover-trigger]';

const saveButton = Button({ id: 'save-order-template-button' });

const infoSectionFields = {
  templateName: orderTemplateInfoSection.find(TextField({ name: 'templateName' })),
  templateCode: orderTemplateInfoSection.find(TextField({ name: 'templateCode' })),
  templateDescription: orderTemplateInfoSection.find(TextArea({ name: 'templateDescription' })),
  hideAll: orderTemplateInfoSection.find(Checkbox({ name: 'hideAll' })),
};

const poInfoSectionFields = {
  poInformationSection: orderTemplatePoInfoSection.find(Button('PO information')),
  organizationLookUp: orderTemplatePoInfoSection.find(Button('Organization look-up')),
  orderType: orderTemplatePoInfoSection.find(Select({ name: 'orderType' })),
};

const poLineDetailsSectionFields = {
  poLineDetailsSection: orderTemplateLineDetailsSection.find(Button('PO line details')),
  acquisitionMethod: orderTemplateLineDetailsSection.find(Selection('Acquisition method')),
};

const defaultSections = {
  orderTemplateInfoSection,
  orderTemplatePoInfoSection,
  orderTemplatePoNotesSection,
  orderTemplatePoTagsSection,
  orderTemplatePoSummarySection,
  orderTemplateItemDetailsSection,
  orderTemplateLineDetailsSection,
  orderTemplateDonorSection,
  orderTemplateVendorDetailsSection,
  orderTemplateCostDetailsSection,
  orderTemplateFundDetailsSection,
  orderTemplateLocationDetailsSection,
  orderTemplatePoLineTagsSection,
};

const ongoingSections = {
  orderTemplateOngoingSection,
  orderTemplatePOLOngoingSection,
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(orderTemplateForm.exists());
  },
  checkOrderTemplateFormContent() {
    cy.expect([
      infoSectionFields.templateName.has({ required: true }),
      infoSectionFields.templateCode.has({ required: false }),
      infoSectionFields.templateDescription.has({ required: false }),
      infoSectionFields.hideAll.has({ checked: false }),
    ]);

    Object.values(defaultSections).forEach((section) => {
      cy.expect(section.exists());
    });

    Object.values(ongoingSections).forEach((section) => {
      cy.expect(section.absent());
    });
  },

  checkPolOngoingOrderSectionAbsent() {
    cy.expect(orderTemplatePOLOngoingSection.absent());
  },
  checkPolOngoingOrderSectionPresent() {
    cy.expect(orderTemplatePOLOngoingSection.exists());
  },
  checkPaymentTermsSectionAbsent() {
    cy.expect(orderTemplatePaymentTermsSection.absent());
  },
  checkPaymentTermsSectionPresent() {
    cy.expect(orderTemplatePaymentTermsSection.exists());
  },

  fillOrderTemplateFields({ templateInformation, poInformation, poLineDetails } = {}) {
    if (templateInformation) {
      this.fillInfoSectionFields(templateInformation);
    }
    if (poInformation) {
      this.fillPoInfoSectionFields(poInformation);
    }
    if (poLineDetails) {
      this.fillPoLineDetailsFields(poLineDetails);
    }
  },
  fillInfoSectionFields({ templateName, templateCode, templateDescription, hideAll }) {
    if (templateName) {
      cy.do([
        infoSectionFields.templateName.focus(),
        infoSectionFields.templateName.fillIn(templateName),
        infoSectionFields.templateName.blur(),
      ]);
    }
    if (templateCode) {
      cy.do(infoSectionFields.templateCode.fillIn(templateCode));
    }
    if (templateDescription) {
      cy.do(infoSectionFields.templateDescription.fillIn(templateDescription));
    }
    if (hideAll) {
      cy.do(infoSectionFields.hideAll.click());
    }
  },
  fillPoInfoSectionFields({ organizationName, orderType }) {
    cy.do(poInfoSectionFields.poInformationSection.click());

    if (organizationName) {
      cy.do(poInfoSectionFields.organizationLookUp.click());
      SearchHelper.searchByName(organizationName);
      SearchHelper.selectFromResultsList();
    }

    if (orderType) {
      cy.do(poInfoSectionFields.orderType.choose(orderType));
    }
  },
  fillPoLineDetailsFields({ acquisitionMethod }) {
    cy.do(poLineDetailsSectionFields.poLineDetailsSection.click());

    if (acquisitionMethod) {
      cy.do([
        poLineDetailsSectionFields.acquisitionMethod.open(),
        SelectionOption(acquisitionMethod).click(),
      ]);
    }
  },
  checkValidationError({ templateName } = {}) {
    if (templateName) {
      cy.do(infoSectionFields.templateName.blur());
      cy.expect(infoSectionFields.templateName.has({ error: 'Required!' }));
    }
  },
  clickSaveButton({ templateCreated = true } = {}) {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());

    if (templateCreated) {
      InteractorsTools.checkCalloutMessage('The template was saved');
    }
  },

  // --- Multi-year prepayment / Payment terms (template form) ---
  checkMultiYearPrepaymentUnchecked() {
    cy.expect(orderTemplateMultiYearPrepaymentCheckbox.has({ checked: false }));
  },
  enableMultiYearPrepayment() {
    cy.do(orderTemplateMultiYearPrepaymentCheckbox.click());
  },
  checkMultiYearPrepaymentChecked() {
    cy.expect(orderTemplateMultiYearPrepaymentCheckbox.has({ checked: true }));
  },
  // The "i" icon next to the "Multi-year prepayment" checkbox in the POL ongoing accordion
  clickMultiYearPrepaymentInfoIcon() {
    cy.get('[name="multiYearPayment"]')
      .closest('[class*="col-"]')
      .find(infoPopoverTriggerSelector)
      .first()
      .click();
  },
  verifyMultiYearPrepaymentInfoPopover() {
    cy.expect(
      Popover().has({
        content: including(
          'Select Multi-year prepayment if paying for orders over multiple fiscal years',
        ),
      }),
    );
  },
  // The "i" icon next to the "Payment terms" accordion header
  clickPaymentTermsInfoIcon() {
    cy.do(orderTemplatePaymentTermsSection.find(Button({ icon: 'info' })).click());
  },
  verifyPaymentTermsInfoPopover() {
    cy.expect(
      Popover().has({
        content: including(
          'To enable the fields in the Payment terms accordion, select Multi-year payment',
        ),
      }),
    );
  },
  checkPaymentTermsExpanded() {
    cy.expect(orderTemplatePaymentTermsSection.has({ open: true }));
  },
  checkPaymentTermsInitialState() {
    cy.expect([
      orderTemplatePaymentTermsSection
        .find(TextField({ name: 'paymentTerms.totalPrice' }))
        .has({ value: '' }),
      orderTemplatePaymentTermsSection
        .find(TextField({ name: 'paymentTerms.prepaymentTerm' }))
        .has({ disabled: true, value: '' }),
      orderTemplatePaymentTermsSection.has({
        text: including(OrderStates.remainingAmountToBeDistributed('0.00')),
      }),
    ]);
  },
  openStartingFiscalYearDropdown() {
    cy.do(
      orderTemplatePaymentTermsSection.find(Selection(including('Starting fiscal year'))).open(),
    );
  },
  checkFiscalYearOptionPresent(fyName) {
    cy.expect(SelectionOption(including(fyName)).exists());
  },
  checkFiscalYearOptionAbsent(fyName) {
    cy.expect(SelectionOption(including(fyName)).absent());
  },
  // The "i" icon next to the "Starting fiscal year" dropdown
  clickStartingFiscalYearInfoIcon() {
    cy.get('[class*="paymentTerms"]')
      .contains('label', 'Starting fiscal year')
      .closest('[class*="col-"]')
      .find(infoPopoverTriggerSelector)
      .first()
      .click();
  },
  verifyStartingFiscalYearInfoPopover() {
    cy.expect(
      Popover().has({
        content: including('Fiscal years must have been created for each year of prepayment'),
      }),
    );
  },

  selectStartingFiscalYear(fyCode) {
    cy.do([
      orderTemplatePaymentTermsSection.perform((el) => el.scrollIntoView()),
      orderTemplatePaymentTermsSection
        .find(Selection(including(PAYMENT_TERMS_LABELS.STARTING_FISCAL_YEAR)))
        .open(),
      SelectionList().filter(fyCode),
      SelectionOption(including(fyCode)).click(),
    ]);
  },

  assertPrepaymentTermValue(value) {
    cy.expect(
      orderTemplatePaymentTermsSection
        .find(TextField({ name: 'paymentTerms.prepaymentTerm' }))
        .has({ value: String(value) }),
    );
  },
  clickAddFiscalYearButton() {
    cy.do(orderTemplatePaymentTermsSection.find(Button('Add fiscal year')).click());
  },
  assertAddFiscalYearButtonEnabled() {
    cy.expect(
      orderTemplatePaymentTermsSection.find(Button('Add fiscal year')).has({ disabled: false }),
    );
  },
  assertAddFiscalYearButtonDisabled() {
    cy.expect(
      orderTemplatePaymentTermsSection.find(Button('Add fiscal year')).has({ disabled: true }),
    );
  },

  assertFiscalYearCardPresent(fyName) {
    cy.expect(orderTemplatePaymentTermsSection.find(Accordion(including(fyName))).exists());
  },
  addFundDistributionInFYCard(fyName) {
    cy.do(
      orderTemplatePaymentTermsSection
        .find(Accordion(including(fyName)))
        .find(AcqFundDistribution())
        .addRow(),
    );
  },
  removeFundDistributionInFYCard({ fyCode, rowIndex = 0 }) {
    cy.do(
      orderTemplatePaymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(AcqFundDistribution())
        .removeRow(rowIndex),
    );
  },

  assertFundDistributionAbsentInFYCard(fyCode) {
    cy.expect(
      orderTemplatePaymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(AcqFundDistribution())
        .has({ rowCount: 0 }),
    );
  },

  selectFundInFYCard({ fyCode, fundName, fundCode, rowIndex = 0 }) {
    cy.do(
      orderTemplatePaymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(AcqFundDistribution())
        .openFundSelector(rowIndex),
    );
    cy.do(SelectionOption(`${fundName} (${fundCode})`).click());
  },

  assertExpenseClassFieldPresentInFYCard(fyCode) {
    cy.expect(
      orderTemplatePaymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(Selection(including('Expense class')))
        .exists(),
    );
  },

  selectDistributionTypePercentInFYCard({ fyCode, rowIndex = 0 }) {
    cy.do(
      orderTemplatePaymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(AcqFundDistribution())
        .selectDistributionTypePercent(rowIndex),
    );
  },
  // The eye icon toggles field visibility (hidden fields) on the template form.
  // Best-effort selector: the "eye-open" icon button next to the target field/accordion.
  clickHideEyeIconForMultiYearPrepayment() {
    cy.get('[name="multiYearPayment"]')
      .closest('[class*="col-"]')
      .find('button[icon="eye-open"], button[aria-label*="eye"]')
      .first()
      .click();
  },
  clickHideEyeIconForPaymentTerms() {
    cy.do(orderTemplatePaymentTermsSection.find(Button({ icon: 'eye-open' })).click());
  },
  selectCurrency(currency = 'USD') {
    cy.do(orderTemplateCostDetailsSection.find(Selection(including('Currency'))).open());
    cy.do(SelectionOption(including(currency)).click());
  },

  clickAddLocationButton() {
    cy.do(
      orderTemplateLocationDetailsSection.find(Button(ORDER_LINE_FORM_LABELS.ADD_LOCATION)).click(),
    );
  },

  expandLocationNameCodeDropdown(index = 0) {
    cy.do(Button({ id: `${LOCATION_FIELD_ID_PREFIX}[${index}].locationId` }).click());
  },

  selectLocationFromDropdown(locationName) {
    cy.do([SelectionList().filter(locationName), SelectionOption(including(locationName)).click()]);
  },

  removeLocationByIndex(index = 0) {
    cy.do(
      orderTemplateLocationDetailsSection
        .find(RepeatableFieldItem({ index }))
        .find(Button({ icon: 'trash' }))
        .click(),
    );
  },

  locationOptionExists(locationName) {
    return SelectionList()
      .find(SelectionOption(including(locationName)))
      .exists();
  },

  selectFundInPaymentTermsCard({ fyCode, fundName, fundCode }) {
    const label = `${fundName} (${fundCode})`;

    const FDInteractor = orderTemplatePaymentTermsSection
      .find(Card({ headerStart: including(fyCode) }))
      .find(AcqFundDistribution());

    cy.do([
      FDInteractor.perform((el) => el.scrollIntoView()),
      FDInteractor.openFundSelector(0),
      SelectionList().filter(label),
      SelectionOption(including(label)).click(),
    ]);
  },

  clickExpandAllAccordions() {
    cy.do(orderTemplateForm.find(Button(COMMON_BUTTON_LABELS.EXPAND_ALL)).click());
  },
};
