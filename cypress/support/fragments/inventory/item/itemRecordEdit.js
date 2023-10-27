import {
  Accordion,
  TextField,
  Button,
  TextArea,
  Select,
  HTML,
  including,
  matching,
  PaneHeader,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import InstanceStates from '../instanceStates';

const itemEditForm = HTML({ className: including('itemForm-') });
const administrativeDataSection = itemEditForm.find(Accordion('Administrative data'));

const cancelBtn = itemEditForm.find(Button({ id: 'cancel-item-edit' }));
const saveAndCloseBtn = itemEditForm.find(Button({ id: 'clickable-save-item' }));

const adminDataFields = {
  barcode: administrativeDataSection.find(TextField('Barcode')),
};

const itemDataFields = {
  materialType: itemEditForm.find(Select({ id: 'additem_materialType' })),
};

const loanDataFields = {
  loanType: itemEditForm.find(Select({ id: 'additem_loanTypePerm' })),
};

export default {
  waitLoading: (itemTitle) => {
    cy.expect(itemEditForm.find(PaneHeader(including(itemTitle))).exists());
    cy.expect(cancelBtn.has({ disabled: false }));
    cy.expect(saveAndCloseBtn.has({ disabled: true }));
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
  saveAndClose({ itemSaved = false } = {}) {
    cy.do(saveAndCloseBtn.click());
    cy.expect(itemEditForm.absent());

    if (itemSaved) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(InstanceStates.itemSavedSuccessfully)),
      );
    }
  },

  fillItemRecordFields({ barcode, materialType, loanType } = {}) {
    if (barcode) {
      cy.do(adminDataFields.barcode.fillIn(barcode));
    }

    if (materialType) {
      cy.do(itemDataFields.materialType.choose(materialType));
    }

    if (loanType) {
      cy.do(loanDataFields.loanType.choose(loanType));
    }
  },
};
