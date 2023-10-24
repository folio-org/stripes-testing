import {
  Accordion,
  TextField,
  Pane,
  Button,
  TextArea,
  Select,
  HTML,
  including,
  matching,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import InstanceStates from '../instanceStates';

const itemEditForm = HTML({ className: including('itemForm-') });

const cancelBtn = itemEditForm.find(Button({ id: 'cancel-item-edit' }));
const saveAndCloseBtn = itemEditForm.find(Button({ id: 'clickable-save-item' }));

const itemDataFields = {
  materialType: itemEditForm.find(Select({ id: 'additem_materialType' })),
};

const loanDataFields = {
  loanType: itemEditForm.find(Select({ id: 'additem_loanTypePerm' })),
};

export default {
  waitLoading: (itemTitle) => {
    cy.expect(Pane(including(itemTitle)).exists());
    cy.expect(cancelBtn.has({ disabled: false }));
    cy.expect(saveAndCloseBtn.has({ disabled: true }));
  },

  addBarcode: (barcode) => {
    cy.do(
      Accordion('Administrative data')
        .find(TextField({ name: 'barcode' }))
        .fillIn(barcode),
    );
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
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

  fillItemRecordFields({ materialType, loanType } = {}) {
    if (materialType) {
      cy.do(itemDataFields.materialType.choose(materialType));
    }

    if (loanType) {
      cy.do(loanDataFields.loanType.choose(loanType));
    }
  },
  addAdministrativeNote: (note) => {
    cy.do([
      Button('Add administrative note').click(),
      TextArea({ ariaLabel: 'Administrative note' }).fillIn(note),
    ]);
  },
};
