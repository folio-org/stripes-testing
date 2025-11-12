import {
  Button,
  Checkbox,
  Form,
  Section,
  Select,
  Selection,
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
      cy.do(infoSectionFields.templateName.fillIn(templateName));
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
};
