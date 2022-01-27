import inventoryInstance from './inventoryInstance';
import { Button, Section } from '../../../../interactors';
import QuickMarcEditor from '../quickMarcEditor';
import InventoryViewSource from './inventoryViewSource';

// TODO: with interactor after solving of https://issues.folio.org/browse/UIIN-1907
const root = Section({ id: 'ui-inventory.holdingsRecordView' });
const actionsButton = root.find(Button('Actions'));
const closeButton = root.find(Button({ icon: 'times' }));
const editInQuickMarcButton = Button({ id: 'clickable-edit-marc-holdings' });
const viewSourceButton = Button({ id: 'clickable-view-source' });

export default {
  newHolding : {
    rowsCountInQuickMarcEditor : 6
  },
  waitLoading: () => {
    cy.expect(actionsButton.exists());
  },
  close: () => {
    cy.do(closeButton.click());
    cy.expect(actionsButton.absent());
    inventoryInstance.waitLoading();
  },
  gotoEditInQuickMarc: () => {
    cy.do(actionsButton.click());
    cy.do(editInQuickMarcButton.click());
    QuickMarcEditor.waitLoading();
  },
  viewSource: () => {
    cy.do(actionsButton.click());
    cy.do(viewSourceButton.click());
    InventoryViewSource.waitHoldingLoading();
  }
};
