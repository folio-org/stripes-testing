import { HTML, including } from '@interactors/html';
import { Button, Section } from '../../../../interactors';

const instanceTitle = 'MARC bibliographic record';
const holdingTitle = 'Holdings record';
const closeButton = Button({ icon: 'times' });
const rootSection = Section({ id: 'marc-view-pane' });

export default {
  contains:(expectedText) => cy.expect(rootSection.find(HTML(including(expectedText))).exists()),
  notContains:(notExpectedText) => cy.expect(rootSection.find(HTML(including(notExpectedText))).absent()),
  waitInstanceLoading: () => cy.expect(rootSection.find(HTML(including(instanceTitle))).exists()),
  waitHoldingLoading: () => cy.expect(rootSection.find(HTML(including(holdingTitle))).exists()),
  close: () => cy.do(closeButton.click()),
  waitLoading:() => cy.expect(rootSection.exists())
};
