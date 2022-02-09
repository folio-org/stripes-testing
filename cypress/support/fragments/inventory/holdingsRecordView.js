import { Button, KeyValue, Modal, Section } from '../../../../interactors';
import InventoryViewSource from './inventoryViewSource';
import NewHoldingsRecord from './newHoldingsRecord';

const root = Section({ id: 'ui-inventory.holdingsRecordView' });
const actionsButton = root.find(Button('Actions'));
const editInQuickMarcButton = Button({ id: 'clickable-edit-marc-holdings' });
const viewSourceButton = Button({ id: 'clickable-view-source' });
const deleteButton = Button({ id: 'clickable-delete-holdingsrecord' });
const duplicateButton = Button({ id: 'copy-holdings' });
const deleteConfirmationModal = Modal({ id:'delete-confirmation-modal' });

export default {
  newHolding : {
    rowsCountInQuickMarcEditor : 6
  },
  waitLoading: () => {
    cy.expect(actionsButton.exists());
  },
  gotoEditInQuickMarc: () => {
    cy.do(actionsButton.click());
    cy.do(editInQuickMarcButton.click());
  },
  viewSource: () => {
    cy.do(actionsButton.click());
    cy.do(viewSourceButton.click());
    InventoryViewSource.waitHoldingLoading();
  },
  checkActionsMenuOptionsInFolioSource:() => {
    cy.do(actionsButton.click());
    cy.expect(viewSourceButton.absent());
    cy.expect(editInQuickMarcButton.absent());
    // close openned Actions
    cy.do(actionsButton.click());
  },
  tryToDelete:() => {
    cy.do(actionsButton.click());
    cy.do(deleteButton.click());
    cy.expect(deleteConfirmationModal.exists());
    cy.do(deleteConfirmationModal.find(Button('Cancel')).click());
    cy.expect(deleteConfirmationModal.absent());
  },
  duplicate:() => {
    cy.do(actionsButton.click());
    cy.do(duplicateButton.click());
    NewHoldingsRecord.waitLoading();
  },
  checkSource:(sourceValue) => {
    cy.expect(KeyValue('Source', { value:sourceValue }).exists());
  }
};
