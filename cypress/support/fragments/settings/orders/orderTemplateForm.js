import {
  Accordion,
  AcqFundDistribution,
  Button,
  Card,
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
import { DEFAULT_WAIT_TIME } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import SearchHelper from '../../finance/financeHelper';

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

  clickAddLocationButton() {
    cy.do(orderTemplateLocationDetailsSection.find(Button('Add location')).click());
  },

  expandLocationNameCodeDropdown(index = 0) {
    cy.do(Button({ id: `field-locations[${index}].locationId` }).click());
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
    cy.do(orderTemplateForm.find(Button('Expand all')).click());
  },
};
