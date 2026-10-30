import {
  Accordion,
  Button,
  Checkbox,
  Form,
  including,
  matching,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  PaneHeader,
  Popover,
  RepeatableFieldItem,
  Section,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextArea,
  TextField,
  ValueChipRoot,
} from '../../../../../interactors';
import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  ORDER_LINE_FORM_LABELS,
  ORDER_TEMPLATE_FORM_ACCORDION_LABELS,
  SUPPRESS_INSTANCE_FROM_DISCOVERY_INFO,
} from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import SearchHelper from '../../finance/financeHelper';
import AreYouSureModal from '../../orders/modals/areYouSureModal';
import SelectInstanceModal from '../../orders/modals/selectInstanceModal';

const LOCATION_FIELD_ID_PREFIX = 'field-locations';

const orderTemplateForm = Form({ id: 'order-template-form' });
const orderTemplateEditorPaneHeader = PaneHeader({
  id: 'paneHeaderorder-settings-order-templates-editor',
});
const closeFormButton = orderTemplateEditorPaneHeader.find(Button({ icon: 'times' }));
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
const orderTemplatePhysicalSection = orderTemplateForm.find(Section({ id: 'physical' }));
const orderTemplateOtherSection = orderTemplateForm.find(Section({ id: 'other' }));
const orderTemplatePoLineTagsSection = orderTemplateForm.find(Section({ id: 'polTags' }));

const saveButton = Button({ id: 'save-order-template-button' });
const fundIdSelection = Selection(including('Fund ID'));

const infoSectionFields = {
  templateName: orderTemplateInfoSection.find(TextField({ name: 'templateName' })),
  templateCode: orderTemplateInfoSection.find(TextField({ name: 'templateCode' })),
  templateDescription: orderTemplateInfoSection.find(TextArea({ name: 'templateDescription' })),
  hideAll: orderTemplateInfoSection.find(Checkbox({ name: 'hideAll' })),
  categories: orderTemplateInfoSection.find(
    MultiSelect({ label: including('Order template categories') }),
  ),
};

const poInfoSectionFields = {
  poInformationSection: orderTemplatePoInfoSection.find(Button('PO information')),
  organizationLookUp: orderTemplatePoInfoSection.find(Button('Organization look-up')),
  orderType: orderTemplatePoInfoSection.find(Select({ name: 'orderType' })),
  vendor: orderTemplatePoInfoSection.find(TextField({ name: 'vendor' })),
};

const poLineDetailsSectionFields = {
  poLineDetailsSection: orderTemplateLineDetailsSection.find(Button('PO line details')),
  acquisitionMethod: orderTemplateLineDetailsSection.find(Selection('Acquisition method')),
  receiptStatus: orderTemplateLineDetailsSection.find(Select({ name: 'receiptStatus' })),
  checkinItems: orderTemplateLineDetailsSection.find(Select({ name: 'checkinItems' })),
  orderFormat: orderTemplateLineDetailsSection.find(Select({ name: 'orderFormat' })),
  claimingActive: orderTemplateLineDetailsSection.find(Checkbox({ name: 'claimingActive' })),
  claimingInterval: orderTemplateLineDetailsSection.find(TextField({ name: 'claimingInterval' })),
  binderyActive: orderTemplateLineDetailsSection.find(
    Checkbox({ name: 'details.isBinderyActive' }),
  ),
};

const physicalResourceDetailsFields = {
  createInventory: orderTemplatePhysicalSection.find(Select({ name: 'physical.createInventory' })),
};

const otherResourceDetailsFields = {
  createInventory: orderTemplateOtherSection.find(Select({ name: 'physical.createInventory' })),
};

const itemDetailsFields = {
  title: orderTemplateItemDetailsSection.find(TextField({ name: 'titleOrPackage' })),
  suppressInstanceFromDiscovery: orderTemplateItemDetailsSection.find(
    Checkbox({ name: 'suppressInstanceFromDiscovery' }),
  ),
};

const ongoingOrderFields = {
  isSubscription: orderTemplateOngoingSection.find(Checkbox({ name: 'ongoing.isSubscription' })),
  renewalInterval: orderTemplateOngoingSection.find(TextField({ name: 'ongoing.interval' })),
};

const eresourceDetailsFields = {
  createInventory: orderTemplateForm.find(Select({ name: 'eresource.createInventory' })),
  activationDue: orderTemplateForm.find(TextField({ name: 'eresource.activationDue' })),
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
  assertOngoingOrderSectionAbsent() {
    cy.expect(orderTemplateOngoingSection.absent());
  },
  assertOngoingOrderSectionPresent() {
    cy.expect(orderTemplateOngoingSection.exists());
  },
  fillOngoingOrderFields({ isSubscription, renewalInterval }) {
    this.expandAccordionById('ongoing');
    if (isSubscription !== undefined) {
      cy.do(
        isSubscription
          ? ongoingOrderFields.isSubscription.checkIfNotSelected()
          : ongoingOrderFields.isSubscription.uncheckIfSelected(),
      );
    }
    if (renewalInterval !== undefined) {
      cy.do(ongoingOrderFields.renewalInterval.fillIn(String(renewalInterval)));
    }
  },
  checkOngoingOrderFields({ isSubscription, renewalInterval }) {
    this.expandAccordionById('ongoing');
    if (isSubscription !== undefined) {
      cy.expect(ongoingOrderFields.isSubscription.has({ checked: isSubscription }));
    }
    if (renewalInterval !== undefined) {
      cy.expect(ongoingOrderFields.renewalInterval.has({ value: String(renewalInterval) }));
    }
  },

  // All text fields, text areas and selects are empty and all checkboxes are unchecked,
  // except fields with names listed in "except"
  verifyFormFieldsEmpty({ except = [] } = {}) {
    cy.get('#order-template-form').should(($form) => {
      const filledFields = [
        ...$form[0].querySelectorAll(
          'input:not([type=hidden]):not([type=button]):not([id^=multiselect-input]), textarea, select',
        ),
      ]
        .filter((field) => !except.includes(field.name))
        .filter((field) => (field.type === 'checkbox' ? field.checked : field.value !== ''))
        .map((field) => field.name || field.id);
      // MultiSelect keeps selected values as chips; its input is only a filter
      const multiSelectValues = [...$form[0].querySelectorAll('[class^=valueChipValue-]')].map(
        (chip) => `multiselect: ${chip.textContent}`,
      );

      expect(
        [...filledFields, ...multiSelectValues],
        'Filled fields in the order template form',
      ).to.deep.equal([]);
    });
  },

  expandAll() {
    cy.do(orderTemplateForm.find(Button(COMMON_BUTTON_LABELS.EXPAND_ALL)).click());
    cy.wait(2000);
  },

  verifyExpandCollapseAllButton({ expanded = false } = {}) {
    const label = expanded ? COMMON_BUTTON_LABELS.COLLAPSE_ALL : COMMON_BUTTON_LABELS.EXPAND_ALL;

    cy.expect(orderTemplateForm.find(Button(label)).has({ disabled: false }));
  },

  expandAccordion(label) {
    cy.do(orderTemplateForm.find(Accordion(including(label))).expand());
  },

  expandAccordionById(id) {
    const accordion = orderTemplateForm.find(Accordion({ id }));

    cy.wait(2000);
    cy.then(() => accordion.open()).then((isOpen) => {
      if (!isOpen) {
        cy.then(() => accordion.label()).then((label) => {
          cy.do(accordion.find(Button(label)).click());
        });
      }
    });
    cy.expect(accordion.has({ open: true }));
  },

  fillOrderTemplateFields({
    templateInformation,
    poInformation,
    poLineDetails,
    eresourceDetails,
  } = {}) {
    if (templateInformation) {
      this.fillInfoSectionFields(templateInformation);
    }
    if (poInformation) {
      this.fillPoInfoSectionFields(poInformation);
    }
    if (poLineDetails) {
      this.fillPoLineDetailsFields(poLineDetails);
    }
    if (eresourceDetails) {
      this.fillEresourceDetailsFields(eresourceDetails);
    }
  },
  // activationDue: number of days; empty string clears the field
  fillEresourceDetailsFields({ createInventory, activationDue }) {
    this.expandAccordion(ORDER_TEMPLATE_FORM_ACCORDION_LABELS.E_RESOURCES_DETAILS);

    if (createInventory) {
      cy.do(eresourceDetailsFields.createInventory.choose(createInventory));
    }
    if (activationDue !== undefined) {
      cy.do(
        activationDue === ''
          ? eresourceDetailsFields.activationDue.clear()
          : eresourceDetailsFields.activationDue.fillIn(String(activationDue)),
      );
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
  assertInfoSectionFields({ templateName, templateCode, templateDescription, categories }) {
    const expectations = [];

    if (templateName !== undefined) {
      expectations.push(infoSectionFields.templateName.has({ value: templateName }));
    }
    if (templateCode !== undefined) {
      expectations.push(infoSectionFields.templateCode.has({ value: templateCode }));
    }
    if (templateDescription !== undefined) {
      expectations.push(infoSectionFields.templateDescription.has({ value: templateDescription }));
    }
    // categories: names of all selected "Order template categories" (shown as chips with "x" icon)
    if (categories !== undefined) {
      expectations.push(infoSectionFields.categories.has({ selectedCount: categories.length }));
      categories.forEach((category) => {
        expectations.push(
          infoSectionFields.categories
            .find(ValueChipRoot(category))
            .find(Button({ icon: 'times' }))
            .exists(),
        );
      });
    }

    cy.expect(expectations);
  },

  // Clicking an option selects it, clicking a selected option ("-" icon) unselects it
  clickCategoryOptions(categories = []) {
    cy.do(infoSectionFields.categories.open());
    categories.forEach((category) => {
      cy.do(MultiSelectMenu().find(MultiSelectOption(category)).clickSegment());
    });
  },

  removeCategory(category) {
    cy.do(
      infoSectionFields.categories
        .find(ValueChipRoot(category))
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },

  checkCategoryOptions(options = []) {
    cy.do(infoSectionFields.categories.open());

    options.forEach(({ name, selected = false }) => {
      cy.expect(MultiSelectMenu().find(MultiSelectOption(name)).has({ selected }));
    });
  },

  // Duplicated template title: "<name> (Copy) - MM/DD/YYYY, H:MM:SS AM"
  verifyDuplicatedTemplateTitle(originalName, { checkNameField = true } = {}) {
    const escapedName = originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const copyNamePattern = new RegExp(
      `^${escapedName} \\(Copy\\) - \\d{1,2}/\\d{1,2}/\\d{4}, \\d{1,2}:\\d{2}:\\d{2}\\s?[AP]M$`,
    );

    cy.expect(orderTemplateEditorPaneHeader.has({ title: matching(copyNamePattern) }));

    if (checkNameField) {
      cy.expect(infoSectionFields.templateName.has({ value: matching(copyNamePattern) }));
    }
  },

  getTemplateName() {
    return cy.get('#order-template-form input[name="templateName"]').invoke('val');
  },

  verifyFormButtons({ saveDisabled = true } = {}) {
    cy.expect([closeFormButton.exists(), saveButton.has({ disabled: saveDisabled })]);
  },
  fillPoInfoSectionFields({ organizationName, orderType }) {
    this.expandAccordionById('poInfo');

    if (organizationName) {
      cy.do(poInfoSectionFields.organizationLookUp.click());
      SearchHelper.searchByName(organizationName);
      SearchHelper.selectFromResultsList();
    }

    if (orderType) {
      cy.do(poInfoSectionFields.orderType.choose(orderType));
    }
  },
  checkItemDetailsFields(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(itemDetailsFields[label].has(conditions));
    });
  },
  clickSuppressInstanceFromDiscoveryCheckbox() {
    cy.do(itemDetailsFields.suppressInstanceFromDiscovery.click());
  },
  verifySuppressInstanceFromDiscoveryInfoPopover() {
    cy.do(orderTemplateItemDetailsSection.find(Button({ icon: 'info' })).click());
    cy.expect(Popover().has({ content: including(SUPPRESS_INSTANCE_FROM_DISCOVERY_INFO) }));
  },
  selectInstanceByTitleLookUp(instanceTitle) {
    cy.do(orderTemplateItemDetailsSection.find(Button('Title look-up')).click());
    SelectInstanceModal.waitLoading();
    SelectInstanceModal.searchByName(instanceTitle);
    SelectInstanceModal.selectInstance();
  },
  // Clearing a linked title opens the "Remove instance connection" modal
  clearTitle() {
    cy.do(itemDetailsFields.title.clear());
  },
  checkPoInfoSectionFields(fields = []) {
    this.expandAccordionById('poInfo');
    fields.forEach(({ label, conditions }) => {
      cy.expect(poInfoSectionFields[label].has(conditions));
    });
  },
  fillPoLineDetailsFields({ acquisitionMethod, receiptStatus, orderFormat, receivingWorkflow }) {
    this.expandAccordionById('lineDetails');

    if (acquisitionMethod) {
      cy.do([
        poLineDetailsSectionFields.acquisitionMethod.open(),
        SelectionOption(acquisitionMethod).click(),
      ]);
    }
    if (receiptStatus) {
      cy.do(poLineDetailsSectionFields.receiptStatus.choose(receiptStatus));
    }
    // Empty string selects the blank option
    if (orderFormat !== undefined) {
      cy.do(poLineDetailsSectionFields.orderFormat.choose(orderFormat));
    }
    if (receivingWorkflow) {
      cy.do(poLineDetailsSectionFields.checkinItems.choose(receivingWorkflow));
    }
  },
  clickBinderyActiveCheckbox() {
    cy.do(poLineDetailsSectionFields.binderyActive.click());
  },
  fillPhysicalResourceDetailsFields({ createInventory }) {
    this.expandAccordionById('physical');

    if (createInventory) {
      cy.do(physicalResourceDetailsFields.createInventory.choose(createInventory));
    }
  },
  checkPhysicalResourceDetailsFields(fields = []) {
    this.expandAccordionById('physical');
    fields.forEach(({ label, conditions }) => {
      cy.expect(physicalResourceDetailsFields[label].has(conditions));
    });
  },
  fillOtherResourceDetailsFields({ createInventory }) {
    this.expandAccordionById('other');

    if (createInventory) {
      cy.do(otherResourceDetailsFields.createInventory.choose(createInventory));
    }
  },
  checkOtherResourceDetailsFields(fields = []) {
    this.expandAccordionById('other');
    fields.forEach(({ label, conditions }) => {
      cy.expect(otherResourceDetailsFields[label].has(conditions));
    });
  },
  checkPoLineDetailsFields(fields = []) {
    this.expandAccordionById('lineDetails');
    fields.forEach(({ label, conditions }) => {
      cy.expect(poLineDetailsSectionFields[label].has(conditions));
    });
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

  closeForm(shouldModalExist = false) {
    // The legacy order-template editor has no Cancel action; its pane-header X closes the form.
    cy.do(closeFormButton.click());

    if (!shouldModalExist) {
      cy.expect(orderTemplateForm.absent());
    }
  },

  closeFormWithUnsavedChanges({ keepEditing = false } = {}) {
    this.closeForm(true);
    AreYouSureModal.verifyAreYouSureForm(true);

    if (keepEditing) {
      AreYouSureModal.clickKeepEditingButton();
      cy.expect(orderTemplateForm.exists());
    } else {
      AreYouSureModal.clickCloseWithoutSavingButton();
      AreYouSureModal.verifyAreYouSureForm(false);
      cy.expect(orderTemplateForm.absent());
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

  verifyFieldVisibilityControl(fieldName, { hidden = false } = {}) {
    cy.do(
      orderTemplateForm.perform((el) => {
        const isHidden = el.querySelector(`input[name="hiddenFields.${fieldName}"]`).checked;

        expect(isHidden, `"${fieldName}" field is hidden`).to.equal(hidden);
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
