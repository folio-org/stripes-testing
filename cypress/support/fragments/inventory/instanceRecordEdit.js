import { HTML, including, matching, or } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  FieldSet,
  KeyValue,
  Modal,
  Pane,
  PaneHeader,
  RepeatableFieldItem,
  Section,
  Select,
  Selection,
  SelectionList,
  TextArea,
  TextField,
} from '../../../../interactors';
import { INSTANCE_DATE_TYPES } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import InstanceStates from './instanceStates';
import InventoryInstanceModal from './modals/inventoryInstanceSelectInstanceModal';

const closeButton = Button({ icon: 'times' });
const saveAndCloseButton = Button('Save & close');
const rootSection = Section({ id: 'instance-form' });
const classificationSection = Section({ label: 'Classification' });
const addClassificationButton = classificationSection.find(Button('Add classification'));
const actionsButton = Button('Actions');
const identifierAccordion = Accordion('Identifier');
const contributorAccordion = Accordion('Contributor');
const subjectAccordion = Accordion('Subject');
const contributorButton = Button('Add contributor');
const deleteButton = Button({ icon: 'trash' });
const supressFromDiscoveryCheckbox = Checkbox({ name: 'discoverySuppress' });
const staffSuppressCheckbox = Checkbox({ name: 'staffSuppress' });
const previoslyHeldCheckbox = Checkbox({ name: 'previouslyHeld' });
const setForDeletionChecbox = Checkbox({ name: 'deleted' });
const instanceStatusTerm = Select('Instance status term');
const addStatisticalCodeButton = Button('Add statistical code');
const addNatureOfContentButton = Button('Add nature of content');
const addParentInstanceButton = Button('Add parent instance');
const addChildInstanceButton = Button('Add child instance');
const parentInstanceFieldSet = FieldSet({ id: 'clickable-add-parent-instance' });
const childInstanceFieldSet = FieldSet({ id: 'clickable-add-child-instance' });
const fieldSetRelationSelect = Select({ content: including('Select type') });
const findInstanceButton = Button({ id: 'find-instance-trigger' });
const deleteItemButton = Button({ ariaLabel: 'Delete this item' });
const subjectField = TextField({ name: 'subjects[0].value' });
const dateTypeSelect = Select({ name: 'dates.dateTypeId' });
const date1Field = TextField({ name: 'dates.date1' });
const date2Field = TextField({ name: 'dates.date2' });
const dateTypePlaceholderOption = 'Select date type';
const dateValueLengthErrorText = 'Date must contain four characters.';
const saveAndKeepEditing = Button('Save & keep editing');
const cancelButton = Button('Cancel');

const checkboxes = {
  'Suppress from discovery': supressFromDiscoveryCheckbox,
  'Staff suppress': staffSuppressCheckbox,
  'Previously held': previoslyHeldCheckbox,
};

function addNatureOfContent() {
  cy.do(addNatureOfContentButton.click());
}

function clickAddStatisticalCodeButton() {
  cy.do(Button('Add statistical code').click());
}

function chooseStatisticalCode(code) {
  cy.do(Button({ name: 'statisticalCodeIds[0]' }).click());
  cy.do(SelectionList().select(code));
}

export default {
  addNatureOfContent,
  clickAddStatisticalCodeButton,
  chooseStatisticalCode,
  dateTypePlaceholderOption,
  close: () => cy.do(closeButton.click()),
  waitLoading: () => {
    cy.expect([
      Pane({ id: 'instance-form' }).exists(),
      or(
        Pane({ titleLabel: including('Edit instance') }).exists(),
        Pane({ titleLabel: including('Edit shared instance') }).exists(),
      ),
    ]);
  },
  // related with Actions->Overlay
  checkReadOnlyFields() {
    const readonlyTextFields = {
      hrId: rootSection.find(TextField('Instance HRID')),
      source: rootSection.find(TextField('Source*')),
    };

    const readonlyButtons = {
      // already checked in scope of fieldset alternativeTitles checking
      // alernativeTitles: rootSection.find(Button('Add alternative title')),
      series: rootSection.find(Button('Add series')),
      editions: rootSection.find(Button('Add edition')),
    };

    // TODO: rename id in https://github.com/folio-org/ui-inventory-es/blob/0d2f3b6b13c4cf28f64e3510d81b606ee354d909/src/edit/InstanceForm.js
    const readonlyAccordions = {
      identifiers: rootSection.find(Accordion({ id: 'instanceSection03' })),
      contributors: rootSection.find(Accordion({ id: 'instanceSection04' })),
    };

    const readonlyFieldsets = {
      physicalDescriptions: rootSection.find(FieldSet('Physical descriptions')),
      formats: rootSection.find(FieldSet('Formats')),
      languages: rootSection.find(FieldSet('Languages')),
      publications: rootSection.find(FieldSet('Publications')),
      publicationFrequency: rootSection.find(FieldSet('Publication frequency')),
      publicationRange: rootSection.find(FieldSet('Publication range')),
      notes: rootSection.find(FieldSet('Notes')),
      electronicAccess: rootSection.find(FieldSet('Electronic access')),
      // TODO: add legend value to this fieldset. It's void actually
      // subjects: rootSection.find(FieldSet('Subjects')),
      classifications: rootSection.find(FieldSet('Classification')),
      precedingTitles: rootSection.find(FieldSet('Preceding titles')),
      succeedingTitles: rootSection.find(FieldSet('Succeeding titles')),
      // related with fields Type and Alternative title
      alternativeTitles: rootSection.find(FieldSet('Alternative titles')),
    };

    const readonlyTextAreas = {
      resourceTitle: rootSection.find(TextArea('Resource title*')),
      indexTitle: rootSection.find(TextArea('Index title')),
    };

    const readonlySelects = {
      // already checked in scope of fieldset alternativeTitles checking
      // type:rootSection.find(FieldSet('Alternative titles')).find(Select('Type*')),
      modeOfIssuance: rootSection.find(Select('Mode of issuance')),
    };

    function getRegularElements(...elementsList) {
      return elementsList.flatMap((elements) => Object.values(elements));
    }

    InteractorsTools.checkAccordionDisabledElements(Object.values(readonlyAccordions));
    InteractorsTools.checkFieldSetDisibledElements(Object.values(readonlyFieldsets));
    InteractorsTools.checkSimpleDisabledElements(
      getRegularElements(readonlyTextFields, readonlyButtons, readonlyTextAreas, readonlySelects),
    );
  },

  addIdentifier: (identifier, value, identifierLine = 0) => {
    cy.expect(identifierAccordion.exists());
    cy.do(Button('Add identifier').click());
    cy.expect(Select('Type*').exists());
    cy.expect(TextField('Identifier').exists());
    cy.do(
      identifierAccordion
        .find(Select({ name: `identifiers[${identifierLine}].identifierTypeId` }))
        .choose(identifier),
    );
    cy.do(TextField({ name: `identifiers[${identifierLine}].value` }).fillIn(value));
    cy.do(saveAndCloseButton.click());
  },

  addPrecedingTitle: (fieldIndex, precedingTitle, isbn, issn) => {
    const fieldNamePref = `precedingTitles[${fieldIndex}]`;

    cy.do([
      Button('Add preceding title').click(),
      TextArea({ name: `${fieldNamePref}.title` }).fillIn(precedingTitle),
      TextField({ name: `${fieldNamePref}.isbn` }).fillIn(isbn),
      TextField({ name: `${fieldNamePref}.issn` }).fillIn(issn),
    ]);
  },
  addAdministrativeNote: (note) => {
    cy.do([
      Button('Add administrative note').click(),
      TextArea({ ariaLabel: 'Administrative note' }).fillIn(note),
    ]);
  },
  addExistingPrecedingTitle: (precedingTitle) => {
    cy.do(Button({ id: 'find-instance-trigger' }).click());
    InventoryInstanceModal.searchByTitle(precedingTitle);
    InventoryInstanceModal.selectInstance();
  },
  addSubject: (subject) => {
    cy.do([subjectAccordion.find(Button('Add subject')).click(), subjectField.fillIn(subject)]);
  },
  addSubjectType: (subjectType) => {
    cy.do([
      subjectAccordion.find(Button('Add subject')).click(),
      Select({ name: 'subjects[0].typeId' }).choose(subjectType),
    ]);
  },
  addSubjectSource: (subjectSource) => {
    cy.do([
      subjectAccordion.find(Button('Add subject')).click(),
      Select({ name: 'subjects[0].sourceId' }).choose(subjectSource),
    ]);
  },
  changeSubject: (subject) => {
    cy.do(subjectField.fillIn(subject));
  },
  deleteSubject: () => {
    cy.do(subjectAccordion.find(Button({ icon: 'trash' })).click());
    cy.wait(1000);
  },
  addParentInstance: (instanceTitle) => {
    cy.do([
      addParentInstanceButton.click(),
      parentInstanceFieldSet.find(RepeatableFieldItem()).find(findInstanceButton).click(),
    ]);
    InventoryInstanceModal.waitLoading();
    InventoryInstanceModal.searchByTitle(instanceTitle);
    InventoryInstanceModal.selectInstance();
  },
  addChildInstance(instanceTitle) {
    cy.do([
      addChildInstanceButton.click(),
      childInstanceFieldSet.find(RepeatableFieldItem()).find(findInstanceButton).click(),
    ]);
    InventoryInstanceModal.waitLoading();
    InventoryInstanceModal.searchByTitle(instanceTitle);
    InventoryInstanceModal.selectInstance();
  },
  selectNatureOfContent(value) {
    cy.do(Select('Nature of content term').choose(value));
  },
  choosePermanentLocation(locationName) {
    // wait fixes selection behavior
    cy.wait(1000);
    cy.do([Selection({ id: 'additem_permanentlocation' }).choose(including(locationName))]);
  },
  chooseTemporaryLocation(locationName) {
    cy.do([Selection({ id: 'additem_temporarylocation' }).choose(including(locationName))]);
  },
  chooseInstanceStatusTerm(statusTerm) {
    cy.do(Select('Instance status term').choose(including(statusTerm)));
  },
  saveAndClose() {
    cy.wait(1500);
    cy.do(saveAndCloseButton.click());
    cy.expect([actionsButton.exists(), PaneHeader(matching(/Edit .*instance/)).absent()]);
  },
  clickSaveAndCloseButton() {
    cy.do(saveAndCloseButton.click());
  },
  clickAddContributor() {
    cy.expect(contributorAccordion.exists());
    cy.do(contributorButton.click());
  },

  fillContributorData(indexRow, name, nameType, type, typeFreeText) {
    cy.do(TextArea({ name: `contributors[${indexRow}].name` }).fillIn(name));
    cy.do(Select({ name: `contributors[${indexRow}].contributorNameTypeId` }).choose(nameType));
    cy.do(Select({ name: `contributors[${indexRow}].contributorTypeId` }).choose(type));
    if (typeFreeText) {
      cy.do(
        TextArea({ name: `contributors[${indexRow}].contributorTypeText` }).fillIn(typeFreeText),
      );
    }
  },

  fillResourceTitle(title) {
    cy.do(TextArea({ id: 'input_instance_title' }).fillIn(title));
  },

  checkInstanceHeader(header) {
    cy.get('#paneHeaderinstance-form-pane-title > h2').should('have.text', header);
  },

  deleteContributor(rowIndex) {
    cy.do(
      Section({ id: 'instanceSection04' })
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(deleteButton)
        .click(),
    );
  },

  verifyAddButtonsDisabledForPrecedingSucceedingTitle() {
    cy.expect([
      Accordion('Title data')
        .find(Button({ id: 'clickable-add-precedingTitle-add-button' }))
        .has({ disabled: true }),
      Accordion('Title data')
        .find(Button({ id: 'clickable-add-succeedingTitle-add-button' }))
        .has({ disabled: true }),
    ]);
    cy.get('#clickable-add-precedingTitle').find('#find-instance-trigger').should('be.disabled');
    cy.get('#clickable-add-succeedingTitle').find('#find-instance-trigger').should('be.disabled');
  },
  clickDiscoverySuppressCheckbox() {
    cy.do(supressFromDiscoveryCheckbox.click());
  },
  verifyDiscoverySuppressCheckbox(isChecked = false, isDisabled = false) {
    if (isChecked) {
      cy.expect(supressFromDiscoveryCheckbox.has({ checked: true, disabled: isDisabled }));
    } else cy.expect(supressFromDiscoveryCheckbox.has({ checked: false, disabled: isDisabled }));
  },
  verifyStaffSuppressCheckbox(isChecked = false, isDisabled = false) {
    if (isChecked) {
      cy.expect(staffSuppressCheckbox.has({ checked: true, disabled: isDisabled }));
    } else cy.expect(staffSuppressCheckbox.has({ checked: false, disabled: isDisabled }));
  },
  verifyPreviouslyHeldCheckbox(isChecked = false) {
    if (isChecked) {
      cy.expect(previoslyHeldCheckbox.has({ checked: true }));
    } else cy.expect(previoslyHeldCheckbox.has({ checked: false }));
  },
  markAsStaffSuppress() {
    cy.do(rootSection.find(staffSuppressCheckbox).click());
  },
  editResourceTitle: (newTitle) => {
    cy.do(TextArea({ name: 'title' }).fillIn(newTitle));
    cy.expect(TextArea({ name: 'title' }).has({ value: newTitle }));
  },
  addStatisticalCode: (code) => {
    clickAddStatisticalCodeButton();
    chooseStatisticalCode(code);
  },
  clickAddNoteButton(noteType, note) {
    cy.do([
      Accordion('Instance notes').find(Button('Add note')).click(),
      Select({ name: 'notes[0].instanceNoteTypeId' }).choose(noteType),
      TextArea({ name: 'notes[0].note' }).fillIn(note),
    ]);
  },
  verifySuccessfulMessage: () => {
    InteractorsTools.checkCalloutMessage(
      matching(new RegExp(InstanceStates.instanceSavedSuccessfully)),
    );
    InteractorsTools.dismissCallout(matching(new RegExp(InstanceStates.instanceSavedSuccessfully)));
  },
  checkCheckboxConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(checkboxes[label].has(conditions));
    });
  },
  verifyCatalogDateInputIsDisabled(isDisabled = true) {
    cy.get('input[name=catalogedDate]').should(`be.${isDisabled ? 'disabled' : 'enabled'}`);
  },
  verifyInstanceStatusTermConditionIsDisabled(status) {
    cy.expect(instanceStatusTerm.has({ disabled: status }));
  },
  verifyStatisticalCodeIsEnabled() {
    cy.do(addStatisticalCodeButton.click());
    cy.expect(Selection({ value: including('Select code') }).visible());
    cy.get('[class*=selectionControlContainer] button').should('be.enabled');
  },
  verifyNatureOfContentIsEnabled() {
    addNatureOfContent();
    cy.expect(Select('Nature of content term').visible());
    cy.expect(Select('Nature of content term').has({ disabled: false }));
  },
  verifyAddParentInstanceIsEnabled() {
    cy.do(addParentInstanceButton.click());
    cy.expect([
      parentInstanceFieldSet.find(RepeatableFieldItem()).find(findInstanceButton).visible(),
      parentInstanceFieldSet.find(RepeatableFieldItem()).find(fieldSetRelationSelect).visible(),
      parentInstanceFieldSet.find(RepeatableFieldItem()).find(deleteItemButton).visible(),
    ]);
    cy.expect([
      parentInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(findInstanceButton)
        .has({ disabled: false }),
      parentInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(fieldSetRelationSelect)
        .has({ disabled: false }),
      parentInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(deleteItemButton)
        .has({ disabled: false }),
    ]);
  },
  verifyAddChildInstanceIsEnabled() {
    cy.do(addChildInstanceButton.click());
    cy.expect([
      childInstanceFieldSet.find(RepeatableFieldItem()).find(findInstanceButton).visible(),
      childInstanceFieldSet.find(RepeatableFieldItem()).find(fieldSetRelationSelect).visible(),
      childInstanceFieldSet.find(RepeatableFieldItem()).find(deleteItemButton).visible(),
    ]);
    cy.expect([
      childInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(findInstanceButton)
        .has({ disabled: false }),
      childInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(fieldSetRelationSelect)
        .has({ disabled: false }),
      childInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(deleteItemButton)
        .has({ disabled: false }),
    ]);
  },
  getStatusTermsFromInstance: () => {
    const statusNames = [];
    return cy
      .get('select[name="statusId"]')
      .each(($element) => {
        cy.wrap($element)
          .invoke('text')
          .then((name) => {
            statusNames.push(name);
          });
      })
      .then(() => {
        const resultArray = statusNames.map((str) => {
          return str
            .replace(/\([^)]+\)/g, '')
            .replace(/ *\([^)]*\) */g, '')
            .replace('Select instance status', '')
            .trim();
        });
        return Array.from(resultArray);
      });
  },
  getStatisticalCodesFromInstance: () => {
    cy.do(Button({ name: 'statisticalCodeIds[0]' }).click());
    return cy
      .get('[class^=overlay-]')
      .find('div[class^=optionSegment-]')
      .then((elements) => {
        const arrayOfCodes = [...elements].map((el) => el.innerText);
        return arrayOfCodes;
      });
  },
  getClassificationOptionsList() {
    cy.do(addClassificationButton.click());
    return cy.then(() => classificationSection
      .find(Select({ name: 'classifications[0].classificationTypeId' }))
      .optionsText());
  },
  deleteStatisticalCode(statisticalCode) {
    cy.do(rootSection.find(Button({ ariaLabel: 'Delete this item' })).click());
    cy.expect(Selection({ value: including(statisticalCode) }).absent());
  },
  selectParentRelationshipType(type) {
    cy.do(
      parentInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(Select({ name: 'parentInstances[0].instanceRelationshipTypeId' }))
        .choose(type),
    );
  },
  selectChildRelationshipType(type) {
    cy.do(
      childInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(Select({ name: 'childInstances[0].instanceRelationshipTypeId' }))
        .choose(type),
    );
  },
  verifyErrorMessageForStatisticalCode: (isPresented = true) => {
    if (isPresented) {
      cy.expect(FieldSet('Statistical code').has({ error: 'Please select to continue' }));
    } else {
      cy.expect(
        FieldSet({
          buttonIds: [including('stripes-selection')],
          error: 'Please select to continue',
        }).absent(),
      );
    }
  },
  closeCancelEditingModal: () => {
    cy.do(
      Modal({ id: 'cancel-editing-confirmation' })
        .find(Button({ id: 'clickable-cancel-editing-confirmation-cancel' }))
        .click(),
    );
  },

  fillDates: (date1 = '', date2 = '', dateType, isTrimmed = false) => {
    if (dateType) {
      cy.do(dateTypeSelect.choose(dateType));
      cy.expect(dateTypeSelect.has({ checkedOptionText: dateType }));
    }
    if (isTrimmed) {
      cy.get('input[name="dates.date1"]').type(date1);
      cy.get('input[name="dates.date2"]').type(date2);
      cy.expect([
        date1Field.has({ value: date1.slice(0, 4) }),
        date2Field.has({ value: date2.slice(0, 4) }),
      ]);
    } else {
      cy.do([date1Field.fillIn(date1), date2Field.fillIn(date2)]);
      cy.expect([date1Field.has({ value: date1 }), date2Field.has({ value: date2 })]);
    }
  },

  verifyDateFieldsPresent: () => {
    cy.expect([dateTypeSelect.exists(), date1Field.exists(), date2Field.exists()]);
  },

  verifyDateTypeOptions: () => {
    Object.values(INSTANCE_DATE_TYPES).forEach((dateType) => {
      cy.expect(dateTypeSelect.has({ content: including(dateType) }));
    });
  },

  verifyDateTypePlaceholderOptionSelected: () => {
    cy.expect(dateTypeSelect.has({ checkedOptionText: dateTypePlaceholderOption }));
  },

  verifyDateFieldsValues: (
    date1 = '',
    date2 = '',
    dateType = dateTypePlaceholderOption,
    enabled = true,
  ) => {
    cy.expect([
      date1Field.has({ disabled: !enabled, value: date1 }),
      date2Field.has({ disabled: !enabled, value: date2 }),
      dateTypeSelect.has({ disabled: !enabled, checkedOptionText: dateType }),
    ]);
  },

  verifyDateTypePlaceholderNotSelectable: () => {
    cy.get('select[name="dates.dateTypeId"] option:first').should('be.disabled');
  },

  verifyDateFieldsValidationErrors: (date1Affected = true, date2Affected = true) => {
    cy.wait(500);
    if (date1Affected) {
      cy.expect(
        date1Field.has({ errorBorder: true, errorTextRed: true, error: dateValueLengthErrorText }),
      );
    } else cy.expect(date1Field.has({ errorBorder: false, error: undefined }));
    if (date2Affected) {
      cy.expect(
        date2Field.has({ errorBorder: true, errorTextRed: true, error: dateValueLengthErrorText }),
      );
    } else cy.expect(date2Field.has({ errorBorder: false, error: undefined }));
  },

  clickSaveAndKeepEditingButton(saved = true) {
    cy.do(saveAndKeepEditing.click());
    if (saved) cy.expect(saveAndKeepEditing.has({ disabled: true }));
  },

  removeClassificationNumber(classificationValue) {
    cy.do(RepeatableFieldItem({ inputValue: classificationValue }).find(deleteButton).click());
    cy.expect(RepeatableFieldItem({ inputValue: classificationValue }).absent());
  },

  clickSetForDeletionCheckbox(isChecked) {
    cy.do(setForDeletionChecbox.click());
    cy.expect(setForDeletionChecbox.has({ checked: isChecked }));
  },

  verifyParentInstance(title, hrid) {
    cy.expect([
      parentInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(KeyValue('Instance HRID'))
        .has({ value: hrid }),
      parentInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(KeyValue('Title*Connected'))
        .has({ value: title }),
    ]);
  },

  verifyChildInstance(title, hrid) {
    cy.expect([
      childInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(KeyValue('Instance HRID'))
        .has({ value: hrid }),
      childInstanceFieldSet
        .find(RepeatableFieldItem())
        .find(KeyValue('Title*Connected'))
        .has({ value: title }),
    ]);
  },

  verifyShareParentLinkingError() {
    cy.expect(
      Modal('Saving instance failed')
        .find(
          HTML(
            including(
              '400: One instance is local and one is shared. To be linked, both instances must be local or shared.',
            ),
          ),
        )
        .exists(),
    );
  },

  verifyErrorMessage(message) {
    cy.expect(
      Modal('Saving instance failed')
        .find(HTML(including(message)))
        .exists(),
    );
  },

  checkButtonsEnabled: ({ saveAndClose = true, saveKeepEditing = true, cancel = true } = {}) => {
    cy.expect([
      cancelButton.has({ disabled: !cancel }),
      saveAndKeepEditing.has({ disabled: !saveKeepEditing }),
      saveAndCloseButton.has({ disabled: !saveAndClose }),
    ]);
  },

  openAddChildInstanceModal() {
    cy.do([
      addChildInstanceButton.click(),
      childInstanceFieldSet.find(RepeatableFieldItem()).find(findInstanceButton).click(),
    ]);
    InventoryInstanceModal.waitLoading();
  },

  openAddParentInstanceModal() {
    cy.do([
      addParentInstanceButton.click(),
      parentInstanceFieldSet.find(RepeatableFieldItem()).find(findInstanceButton).click(),
    ]);
    InventoryInstanceModal.waitLoading();
  },

  closeSelectInstanceModal() {
    InventoryInstanceModal.close();
  },
};
