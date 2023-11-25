import { including } from '@interactors/html';
import {
  Accordion,
  TextField,
  Pane,
  Button,
  Section,
  FieldSet,
  TextArea,
  Select,
  RepeatableFieldItem,
  HTML,
  matching,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import InstanceStates from '../instanceStates';

const saveAndCloseBtn = Button('Save & close');
const cancelBtn = Button('Cancel');
const callNumberTextField = TextArea('Call number');
const callNumberType = Select('Call number type');
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
    cy.do(callNumberType.choose(type));
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

  createViaApi: ({ holdingsId, itemBarcode, materialTypeId, permanentLoanTypeId, ...props }) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'inventory/items',
        body: {
          status: { name: 'Available' },
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
};
