import {
  Accordion,
  Button,
  Checkbox,
  Form,
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
import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  ORDER_LINE_FORM_LABELS,
} from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import SearchHelper from '../../finance/financeHelper';

const LOCATION_FIELD_ID_PREFIX = 'field-locations';

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

const saveButton = Button({ id: 'save-order-template-button' });
const fundIdSelection = Selection(including('Fund ID'));

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

  assertPolOngoingOrderSectionAbsent() {
    cy.expect(orderTemplatePOLOngoingSection.absent());
  },
  assertPolOngoingOrderSectionPresent() {
    cy.expect(orderTemplatePOLOngoingSection.exists());
  },

  expandAll() {
    cy.do(orderTemplateForm.find(Button(COMMON_BUTTON_LABELS.EXPAND_ALL)).click());
  },

  expandAccordion(label) {
    cy.do(orderTemplateForm.find(Accordion(including(label))).expand());
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
  assertInfoSectionFields({ templateName, templateCode }) {
    const expectations = [];

    if (templateName !== undefined) {
      expectations.push(infoSectionFields.templateName.has({ value: templateName }));
    }
    if (templateCode !== undefined) {
      expectations.push(infoSectionFields.templateCode.has({ value: templateCode }));
    }

    cy.expect(expectations);
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

  selectCurrency(currency = 'USD') {
    const field = orderTemplateCostDetailsSection.find(
      Selection(including(ORDER_LINE_FORM_LABELS.CURRENCY)),
    );

    cy.do([
      field.perform((el) => el.scrollIntoView()),
      field.open(),
      SelectionList().filter(currency),
      SelectionOption(including(currency)).click(),
    ]);
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

  verifyLocationSelected({ location, index = 0 }) {
    cy.expect(
      orderTemplateLocationDetailsSection
        .find(RepeatableFieldItem({ index }))
        .find(Selection(including('Name (code)')))
        .has({ value: including(location) }),
    );
  },

  clickAddFundDistributionButton() {
    cy.do(orderTemplateFundDetailsSection.find(Button('Add fund distribution')).click());
  },

  selectFundDistribution({ fundName, fundCode, index = 0 }) {
    const label = `${fundName} (${fundCode})`;

    cy.do([
      orderTemplateFundDetailsSection
        .find(RepeatableFieldItem({ index }))
        .find(fundIdSelection)
        .open(),
      SelectionList().filter(label),
      SelectionOption(including(label)).click(),
    ]);
  },

  verifyFundDistributionSelected({ fundCode, index = 0 }) {
    cy.expect(
      orderTemplateFundDetailsSection
        .find(RepeatableFieldItem({ index }))
        .find(fundIdSelection)
        .has({ value: including(fundCode) }),
    );
  },

  clickExpandAllAccordions() {
    cy.do(orderTemplateForm.find(Button(COMMON_BUTTON_LABELS.EXPAND_ALL)).click());
  },

  /* Fields visibility */
  toggleFieldVisibilityIcon(fieldName) {
    cy.do(
      orderTemplateForm.perform((el) => {
        el.querySelector(`input[name="hiddenFields.${fieldName}"]`).click();
      }),
    );
  },

  toggleMultiYearPrepaymentVisibility() {
    this.toggleFieldVisibilityIcon('multiYearPayment');
  },

  togglePaymentTermsVisibility() {
    this.toggleFieldVisibilityIcon('paymentTerms');
  },
};
