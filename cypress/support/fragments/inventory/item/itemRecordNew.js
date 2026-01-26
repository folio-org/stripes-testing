import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
  FieldSet,
  HTML,
  Pane,
  RepeatableFieldItem,
  Section,
  Select,
  Selection,
  SelectionList,
  TextArea,
  TextField,
  matching,
} from '../../../../../interactors';
import { ITEM_STATUS_NAMES } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import InstanceStates from '../instanceStates';

const saveAndCloseBtn = Button('Save & close');
const cancelBtn = Button('Cancel');
const callNumberTextField = TextArea('Call number');
const callNumberTypeSelect = Select('Call number type');
const administrativeDataSection = Section({ id: 'acc01' });
const enumerationDataSection = Section({ id: 'acc03' });
const itemNotesSection = Section({ id: 'acc05' });
const loanAndAvailabilitySection = Section({ id: 'acc06' });
const electronicAccessSection = Section({ id: 'acc09' });
const addFormerIdentifierBtn = administrativeDataSection.find(Button('Add former identifier'));
const addStatisticalCodeBtn = administrativeDataSection.find(Button('Add statistical code'));
const addAdministrativeNoteBtn = administrativeDataSection.find(Button('Add administrative note'));
const addYearCaptionBtn = enumerationDataSection.find(Button('Add year, caption'));
const addNoteBtn = itemNotesSection.find(Button('Add note'));
const addCheckInCheckOutNoteBtn = loanAndAvailabilitySection.find(
  Button('Add check in / check out note'),
);
const addElectronicAccessBtn = electronicAccessSection.find(Button('Add electronic access'));
const statisticalCodeFieldSet = administrativeDataSection.find(FieldSet('Statistical code'));
const formerIdentifierFieldSet = administrativeDataSection.find(FieldSet('Former identifier'));
const administrativeNoteFieldSet = administrativeDataSection.find(FieldSet('Administrative note'));
const yearCaptionFieldSet = enumerationDataSection.find(FieldSet('Year, caption'));
const noteFieldSet = itemNotesSection.find(FieldSet('Note type*'));
const checkInCheckOutFieldSet = loanAndAvailabilitySection.find(FieldSet('Note type*'));
const electronicAccessFieldSet = electronicAccessSection.find(FieldSet('Electronic access'));
const itemEditForm = HTML({ className: including('itemForm-') });
const statisticalCodeSelectionList = SelectionList({ id: including('sl-container-selection-:r') });

function addBarcode(barcode) {
  cy.do(
    Accordion('Administrative data')
      .find(TextField({ name: 'barcode' }))
      .fillIn(barcode),
  );
  cy.expect(saveAndCloseBtn.has({ disabled: false }));
}
function addMaterialType(materialType) {
  cy.do(Select({ id: 'additem_materialType' }).choose(materialType));
}
function addPermanentLoanType(loanType) {
  cy.do(Select({ id: 'additem_loanTypePerm' }).choose(loanType));
}

export default {
  addBarcode,
  addMaterialType,
  addPermanentLoanType,
  waitLoading: (itemTitle) => {
    cy.expect(Pane(including(itemTitle)).exists());
    cy.expect(cancelBtn.has({ disabled: false }));
  },
  fillItemRecordFields({ barcode, materialType, loanType } = {}) {
    if (barcode) {
      addBarcode(barcode);
    }
    if (materialType) {
      addMaterialType(materialType);
    }
    if (loanType) {
      addPermanentLoanType(loanType);
    }
  },
  addCallNumber: (callNumber) => {
    cy.do(callNumberTextField.fillIn(callNumber));
  },
  chooseCallNumberType: (type) => {
    cy.do(callNumberTypeSelect.choose(type));
  },
  save: () => cy.do(saveAndCloseBtn.click()),
  saveAndClose({ itemSaved = false } = {}) {
    cy.do(saveAndCloseBtn.click());
    cy.expect(itemEditForm.absent());

    if (itemSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(InstanceStates.itemSavedSuccessfully)),
      );
    }
  },
  cancel: () => {
    cy.do(cancelBtn.click());
  },

  createViaApi: ({ holdingsId, itemBarcode, materialTypeId, permanentLoanTypeId, ...props }) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'inventory/items',
        body: {
          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
          holdingsRecordId: holdingsId,
          boundWithTitles: [],
          barcode: itemBarcode,
          materialType: { id: materialTypeId },
          permanentLoanType: { id: permanentLoanTypeId },
          ...props,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((res) => {
        return res.body;
      });
  },

  clickFormerIdentifierButton() {
    cy.do(addFormerIdentifierBtn.click());
    cy.expect([
      formerIdentifierFieldSet.exists(),
      formerIdentifierFieldSet
        .find(RepeatableFieldItem())
        .find(Button({ icon: 'trash' }))
        .exists(),
    ]);
  },

  clickStatisticalCodeButton() {
    cy.do(addStatisticalCodeBtn.click());
    cy.expect([
      statisticalCodeFieldSet.exists(),
      statisticalCodeFieldSet
        .find(RepeatableFieldItem())
        .find(Button({ icon: 'trash' }))
        .exists(),
    ]);
    cy.wait(1000);
  },

  clickAddAdministrativeNoteButton() {
    cy.do(addAdministrativeNoteBtn.click());
    cy.expect([
      administrativeNoteFieldSet.exists(),
      administrativeNoteFieldSet
        .find(RepeatableFieldItem())
        .find(Button({ icon: 'trash' }))
        .exists(),
    ]);
  },

  clickAddYearCaptionButton() {
    cy.do(addYearCaptionBtn.click());
    cy.expect([
      yearCaptionFieldSet.exists(),
      yearCaptionFieldSet
        .find(RepeatableFieldItem())
        .find(Button({ icon: 'trash' }))
        .exists(),
    ]);
  },

  clickAddNoteButton() {
    cy.do(addNoteBtn.click());
    cy.expect([
      noteFieldSet.exists(),
      noteFieldSet
        .find(RepeatableFieldItem())
        .find(Button({ icon: 'trash' }))
        .exists(),
    ]);
  },

  clickAddCheckInCheckOutNoteButton() {
    cy.do(addCheckInCheckOutNoteBtn.click());
    cy.expect([
      checkInCheckOutFieldSet.exists(),
      checkInCheckOutFieldSet
        .find(RepeatableFieldItem())
        .find(Button({ icon: 'trash' }))
        .exists(),
    ]);
  },

  clickAddElectronicAccessButton() {
    cy.do(addElectronicAccessBtn.click());
    cy.expect([
      electronicAccessFieldSet.exists(),
      electronicAccessFieldSet
        .find(RepeatableFieldItem())
        .find(Button({ icon: 'trash' }))
        .exists(),
    ]);
  },

  openStatisticalCodeDropdown() {
    cy.do(statisticalCodeFieldSet.find(Selection()).find(Button()).click());
    cy.wait(1000);
  },

  verifyStatisticalCodeDropdown() {
    cy.expect(statisticalCodeSelectionList.has({ placeholder: 'Filter options list' }));
    cy.then(() => statisticalCodeSelectionList.optionCount().then((count) => {
      expect(count).to.greaterThan(0);
    }));
  },

  filterStatisticalCodeByName(name) {
    cy.do(statisticalCodeSelectionList.filter(name));
    cy.wait(1000);
  },

  verifyStatisticalCodeListOptionsFilteredBy(name) {
    cy.then(() => statisticalCodeSelectionList.optionList()).then((list) => {
      cy.wait(1000);
      list.forEach((option) => expect(option).to.include(name));
    });
  },

  chooseStatisticalCode(code, rowIndex = 1) {
    cy.do([
      statisticalCodeFieldSet
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Selection())
        .choose(including(code)),
    ]);
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

  fillCallNumberValues({
    callNumber,
    callNumberType,
    callNumberPrefix,
    callNumberSuffix,
    copyNumber,
    volume,
    enumeration,
    chronology,
  }) {
    if (callNumber) this.addCallNumber(callNumber);
    if (callNumberType) this.chooseCallNumberType(callNumberType);
    if (callNumberPrefix) cy.do(TextArea('Call number prefix').fillIn(callNumberPrefix));
    if (callNumberSuffix) cy.do(TextArea('Call number suffix').fillIn(callNumberSuffix));
    if (copyNumber) cy.do(TextField('Copy number').fillIn(copyNumber));
    if (volume) cy.do(TextField('Volume').fillIn(volume));
    if (enumeration) cy.do(TextArea('Enumeration').fillIn(enumeration));
    if (chronology) cy.do(TextArea('Chronology').fillIn(chronology));
  },

  selectPermanentLocation(location) {
    cy.do([
      Button({ id: 'additem_permanentlocation' }).click(),
      SelectionList().filter(location),
      SelectionList().select(including(location)),
    ]);
  },

  selectTemporaryLocation(location) {
    cy.do([
      Button({ id: 'additem_temporarylocation' }).click(),
      SelectionList().filter(location),
      SelectionList().select(including(location)),
    ]);
  },

  markAsSuppressedFromDiscovery() {
    cy.do(Checkbox('Suppress from discovery').click());
  },

  checkMarkedAsSuppressedFromDiscovery(isMarked = true) {
    cy.expect(Checkbox('Suppress from discovery').is({ checked: isMarked }));
  },

  addElectronicAccessFields({
    relationshipType,
    uri,
    linkText,
    materialsSpecified,
    urlPublicNote,
    rowNumber = 1,
  }) {
    cy.do(addElectronicAccessBtn.click());

    const targetRow = RepeatableFieldItem({ index: rowNumber });

    if (relationshipType) {
      cy.do(targetRow.find(Select('Relationship')).choose(relationshipType));
    }
    if (uri) {
      cy.do(targetRow.find(TextArea({ ariaLabel: 'URI' })).fillIn(uri));
    }
    if (linkText) {
      cy.do(targetRow.find(TextArea({ ariaLabel: 'Link text' })).fillIn(linkText));
    }
    if (materialsSpecified) {
      cy.do(
        targetRow.find(TextArea({ ariaLabel: 'Materials specified' })).fillIn(materialsSpecified),
      );
    }
    if (urlPublicNote) {
      cy.do(targetRow.find(TextArea({ ariaLabel: 'URL public note' })).fillIn(urlPublicNote));
    }
  },
};
