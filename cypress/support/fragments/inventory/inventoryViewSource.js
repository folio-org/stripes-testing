import { HTML, including } from '@interactors/html';
import { Button, Section } from '../../../../interactors';
import InventoryInstance from './inventoryInstance';

const instanceTitle = 'MARC bibliographic record';
const holdingTitle = 'Holdings record';
const closeButton = Button({ icon: 'times' });
const rootSection = Section({ id: 'marc-view-pane' });

const closeDetailView = () => cy.do(Button({ icon: 'times' }).click());

export default {
  closeDetailView,
  contains:(expectedText) => cy.expect(rootSection.find(HTML(including(expectedText))).exists()),
  notContains:(notExpectedText) => cy.expect(rootSection.find(HTML(including(notExpectedText))).absent()),
  waitInstanceLoading: () => cy.expect(rootSection.find(HTML(including(instanceTitle))).exists()),
  waitHoldingLoading: () => cy.expect(rootSection.find(HTML(including(holdingTitle))).exists()),
  close: () => cy.do(closeButton.click()),
  waitLoading:() => cy.expect(rootSection.exists()),

  verifyMARCBibSource:(itemBarcode) => {
    InventoryInstance.viewSource();
    // verify table data in marc bibliographic source
    cy.contains('980').parent('tr').should('exist');
    cy.contains('KU/CC/DI/M').parent('tr').should('exist');
    cy.contains('981').parent('tr').should('exist');
    cy.contains(itemBarcode).parent('tr').should('exist');
    closeDetailView();
  }
};
