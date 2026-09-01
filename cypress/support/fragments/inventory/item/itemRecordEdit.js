import {
  Accordion,
  Button,
  Checkbox,
  FieldSet,
  HTML,
  including,
  matching,
  Modal,
  Pane,
  Select,
  SelectionList,
  SelectionOption,
  TextArea,
  TextField,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import getRandomPostfix from '../../../utils/stringTools';
import InstanceStates from '../instanceStates';

const itemEditForm = HTML({ className: including('paneset-') });
const administrativeDataSection = itemEditForm.find(Accordion('Administrative data'));
const statisticalCodeFieldSet = administrativeDataSection.find(FieldSet('Statistical code'));
const cancelBtn = Button({ id: 'cancel-item-edit' });
const saveAndCloseBtn = Button({ id: 'clickable-save-item' });

const adminDataFields = {
  barcode: administrativeDataSection.find(TextField('Barcode')),
};

const itemDataFields = {
  materialType: itemEditForm.find(Select({ id: 'additem_materialType' })),
  copyNumber: itemEditForm.find(TextField({ name: 'copyNumber' })),
};

const loanDataFields = {
  loanType: itemEditForm.find(Select({ id: 'additem_loanTypePerm' })),
  temporaryLoanType: itemEditForm.find(Select({ id: 'additem_loanTypeTemp' })),
};
const conditionFields = {
  damagedStatus: itemEditForm.find(Select({ id: 'input_item_damaged_status_id' })),
};
const addNoteBtn = Accordion('Item notes').find(Button('Add note'));

const temporaryLocationDropdown = Button({ id: 'additem_temporarylocation' });
const temporaryLocationList = SelectionList({ id: 'sl-container-additem_temporarylocation' });

const permanentLocationDropdown = Button({ id: 'additem_permanentlocation' });
const permanentLocationList = SelectionList({ id: 'sl-container-additem_permanentlocation' });
const boundWithAndAnalyticsAccordion = Accordion('Bound-with and analytics');
const addBoundWithAndAnalyticsButton = boundWithAndAnalyticsAccordion.find(
  Button('Add Bound-with and analytics'),
);
const addBoundWithAndAnalyticsModal = Modal('Add Bound-with and analytics');
const buttonCancel = Button('Cancel');
const buttonSaveAndClose = Button('Save & close');
const boundWithModalInput = (index = 0) => TextField({ testid: 'bound-with-modal-input', dataIndex: `${index}` });
const instanceHridField = (index) => TextField({ name: `boundWithTitles[${index}].briefInstance.hrid` });
const instanceTitleField = (index) => TextField({ name: `boundWithTitles[${index}].briefInstance.title` });
const holdingsHridField = (index) => TextField({ name: `boundWithTitles[${index}].briefHoldingsRecord.hrid` });

function clickAddStatisticalCodeButton() {
  cy.do(Button('Add statistical code').click());
}

function chooseStatisticalCode(code, index = 0) {
  cy.do(Button({ name: `statisticalCodeIds[${index}]` }).click());
  cy.do(SelectionList().select(code));
}

export default {
  clickAddStatisticalCodeButton,
  chooseStatisticalCode,
  waitLoading: (itemTitle) => {
    cy.expect([
      Pane(including(itemTitle)).exists(),
      cancelBtn.has({ disabled: false }),
      saveAndCloseBtn.has({ disabled: true }),
    ]);
  },
  cancel: () => {
    cy.do(cancelBtn.click());
  },
  addBarcode: (barcode) => {
    cy.do(adminDataFields.barcode.fillIn(barcode));
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
  },
  verifyBarcodeFieldFocusedByDefault: () => {
    cy.get('input[name="barcode"]').should('be.focused');
  },
  addAdministrativeNote: (note) => {
    cy.do([
      Button('Add administrative note').click(),
      TextArea({ ariaLabel: 'Administrative note' }).fillIn(note),
    ]);
  },
  addYearCaption: (year) => {
    cy.do([
      Button('Add year, caption').click(),
      TextField({ name: 'yearCaption[0]' }).fillIn(year),
    ]);
  },
  addFormerIdentifier: (identifier) => {
    cy.do([
      Button('Add former identifier').click(),
      TextField({ name: 'formerIds[0]' }).fillIn(identifier),
    ]);
  },
  addNotes: (
    notes = [{ text: `Note ${getRandomPostfix()}`, noteType: 'Action note', staffOnly: false }],
  ) => {
    notes.forEach((note, index) => {
      cy.do([
        addNoteBtn.click(),
        Select({ name: `notes[${index}].itemNoteTypeId` }).choose(note.noteType),
        TextArea({ name: `notes[${index}].note` }).fillIn(note.text),
      ]);
      if (note.staffOnly) cy.do(Checkbox({ name: `notes[${index}].staffOnly` }).click());
    });
  },
  deleteNote: () => {
    cy.do([Button({ icon: 'trash' }).click()]);
  },
  addItemsNotes: (text, type = 'Action note') => {
    cy.do([
      addNoteBtn.click(),
      Select('Note type*').choose(type),
      TextArea({ ariaLabel: 'Note' }).fillIn(text),
    ]);
  },
  editItemNotes: (newType, newText) => {
    cy.do([Select('Note type*').choose(newType), TextArea({ ariaLabel: 'Note' }).fillIn(newText)]);
  },
  saveAndClose({ itemSaved = false } = {}) {
    cy.do(saveAndCloseBtn.click());

    if (itemSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(InstanceStates.itemSavedSuccessfully)),
      );
    }
    cy.wait(2000);
  },

  fillItemRecordFields({
    barcode,
    materialType,
    copyNumber,
    loanType,
    callNumberPrefix,
    callNumber,
    callNumberSuffix,
    volume,
    enumeration,
    chronology,
  } = {}) {
    if (barcode) {
      cy.do(adminDataFields.barcode.fillIn(barcode));
    }

    if (materialType) {
      cy.do(itemDataFields.materialType.choose(materialType));
    }

    if (copyNumber) {
      cy.do(itemDataFields.copyNumber.fillIn(copyNumber));
    }

    if (loanType) {
      cy.do(loanDataFields.loanType.choose(loanType));
    }

    if (callNumberPrefix && callNumber) {
      this.addEffectiveCallNumber(callNumberPrefix, callNumber);
    }

    if (callNumberSuffix) {
      this.addCallNumberSuffix(callNumberSuffix);
    }

    if (volume) {
      this.addVolume(volume);
    }

    if (enumeration) {
      this.addEnumeration(enumeration);
    }

    if (chronology) {
      this.addChronology(chronology);
    }
  },
  chooseItemPermanentLoanType: (permanentLoanType) => {
    cy.do(loanDataFields.loanType.choose(permanentLoanType));
    cy.expect(loanDataFields.loanType.has({ checkedOptionText: permanentLoanType }));
  },
  addTemporaryLoanType: (temporaryLoanType) => {
    cy.do(loanDataFields.temporaryLoanType.choose(temporaryLoanType));
    cy.expect(loanDataFields.temporaryLoanType.has({ checkedOptionText: temporaryLoanType }));
  },
  chooseItemDamagedStatus: (damagedStatus) => {
    cy.do(conditionFields.damagedStatus.choose(damagedStatus));
    cy.expect(conditionFields.damagedStatus.has({ checkedOptionText: damagedStatus }));
  },
  clearItemDamagedStatus: () => {
    cy.do(conditionFields.damagedStatus.choose('Select status'));
    cy.expect(conditionFields.damagedStatus.has({ checkedOptionText: 'Select status' }));
  },
  openTemporaryLocation() {
    cy.do(temporaryLocationDropdown.click());
  },
  verifyTemporaryLocationItemExists: (temporarylocation) => {
    cy.expect(temporaryLocationList.exists());
    cy.expect(temporaryLocationList.find(SelectionOption(including(temporarylocation))).exists());
  },
  clearValueInPermanentLocation() {
    cy.do([
      permanentLocationDropdown.click(),
      SelectionList().filter('Select location'),
      SelectionList().select(including('Select location')),
    ]);
  },
  openPermanentLocation() {
    cy.do(permanentLocationDropdown.click());
  },
  choosePermanentLocation(permanentLocation) {
    cy.do([
      permanentLocationDropdown.click(),
      permanentLocationList.filter(permanentLocation),
      permanentLocationList.select(including(permanentLocation)),
    ]);
  },
  verifyPermanentLocationItemExists: (permanentLocation) => {
    cy.expect(permanentLocationList.exists());
    cy.expect(permanentLocationList.find(SelectionOption(including(permanentLocation))).exists());
  },
  clearValueInTemporaryLocation() {
    cy.do([
      temporaryLocationDropdown.click(),
      SelectionList().filter('Select location'),
      SelectionList().select(including('Select location')),
    ]);
  },
  closeCancelEditingModal: () => {
    cy.do(
      Modal({ id: 'cancel-editing-confirmation' })
        .find(Button({ id: 'clickable-cancel-editing-confirmation-cancel' }))
        .click(),
    );
  },

  addEffectiveCallNumber: (numberPrefix, number) => {
    cy.do([
      TextArea({ id: 'additem_callnumberprefix' }).fillIn(numberPrefix),
      TextArea({ id: 'additem_callnumber' }).fillIn(number),
    ]);
  },

  addStatisticalCode: (code, index = 0) => {
    clickAddStatisticalCodeButton();
    chooseStatisticalCode(code, index);
  },

  deleteStatisticalCodeByName(statisticalCode) {
    cy.contains(statisticalCode)
      .should('be.visible')
      .closest('[data-test-repeatable-field-list-item="true"]')
      .find('button[data-test-repeatable-field-remove-item-button="true"]')
      .click();
    cy.contains(statisticalCode).should('not.exist');
  },

  markAsSuppressedFromDiscovery() {
    cy.do(Checkbox('Suppress from discovery').click());
  },

  addDisplaySummary(displaySummary) {
    cy.do(TextField('Display summary').fillIn(displaySummary));
  },

  addEnumeration(value) {
    cy.do(TextArea('Enumeration').fillIn(value));
  },

  addChronology(value) {
    cy.do(TextArea('Chronology').fillIn(value));
  },

  addCallNumberSuffix(value) {
    cy.do(TextArea('Call number suffix').fillIn(value));
  },

  addVolume(value) {
    cy.do(TextField('Volume').fillIn(value));
  },

  checkErrorMessageForStatisticalCode: (isPresented = true) => {
    if (isPresented) {
      cy.expect(statisticalCodeFieldSet.has({ error: 'Please select to continue' }));
    } else {
      cy.expect(
        FieldSet({
          buttonIds: [including('stripes-selection')],
          error: 'Please select to continue',
        }).absent(),
      );
    }
  },

  clickAddBoundWithAndAnalyticsButton() {
    cy.do(addBoundWithAndAnalyticsButton.click());
    cy.expect(addBoundWithAndAnalyticsModal.exists());
  },

  verifyAddBoundWithAndAnalyticsModal(itemHrid, itemBarcode) {
    cy.expect([
      addBoundWithAndAnalyticsModal
        .find(HTML(`Item HRID:${itemHrid}\nBarcode:${itemBarcode}`))
        .exists(),
      addBoundWithAndAnalyticsModal.find(buttonCancel).exists(),
      addBoundWithAndAnalyticsModal.find(buttonSaveAndClose).exists(),
      addBoundWithAndAnalyticsModal.find(boundWithModalInput()).exists(),
    ]);
  },

  fillHridAddBoundWithAndAnalyticsModal(holdingsHrid, index = 0) {
    cy.do(addBoundWithAndAnalyticsModal.find(boundWithModalInput(`${index}`)).fillIn(holdingsHrid));
    cy.expect(
      addBoundWithAndAnalyticsModal
        .find(boundWithModalInput(`${index}`))
        .has({ value: holdingsHrid }),
    );
  },

  saveAddBoundWithAndAnalyticsModal() {
    cy.do(addBoundWithAndAnalyticsModal.find(buttonSaveAndClose).click());
    cy.expect(addBoundWithAndAnalyticsModal.absent());
  },

  verifyBoundWithAndAnalyticsRow(instanceHrid, instanceTitle, holdingsHrid, rowIndex = 0) {
    cy.expect([
      boundWithAndAnalyticsAccordion.find(instanceHridField(rowIndex)).has({ value: instanceHrid }),
      boundWithAndAnalyticsAccordion
        .find(instanceTitleField(rowIndex))
        .has({ value: instanceTitle }),
      boundWithAndAnalyticsAccordion.find(holdingsHridField(rowIndex)).has({ value: holdingsHrid }),
    ]);
  },
};
