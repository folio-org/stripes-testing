import {
  Accordion,
  Button,
  Checkbox,
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
const addNoteBtn = Accordion('Item notes').find(Button('Add note'));

const temporaryLocationDropdown = Button({ id: 'additem_temporarylocation' });
const temporaryLocationList = SelectionList({ id: 'sl-container-additem_temporarylocation' });

const permanentLocationDropdown = Button({ id: 'additem_permanentlocation' });
const permanentLocationList = SelectionList({ id: 'sl-container-additem_permanentlocation' });

export default {
  waitLoading: (itemTitle) => {
    cy.expect([
      Pane(including(itemTitle)).exists(),
      cancelBtn.has({ disabled: false }),
      saveAndCloseBtn.has({ disabled: true }),
    ]);
  },
  addBarcode: (barcode) => {
    cy.do(adminDataFields.barcode.fillIn(barcode));
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
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

  fillItemRecordFields({ barcode, materialType, copyNumber, loanType } = {}) {
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
  },
  chooseItemPermanentLoanType: (permanentLoanType) => {
    cy.do(loanDataFields.loanType.choose(permanentLoanType));
    cy.expect(loanDataFields.loanType.has({ checkedOptionText: permanentLoanType }));
  },
  addTemporaryLoanType: (temporaryLoanType) => {
    cy.do(loanDataFields.temporaryLoanType.choose(temporaryLoanType));
    cy.expect(loanDataFields.temporaryLoanType.has({ checkedOptionText: temporaryLoanType }));
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
};
