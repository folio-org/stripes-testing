import { MultiColumnList, HTML, including, Button } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

const rootCss = 'section[id=pane-instancedetails]';
// TODO: rewrite to interactor with filter by id
const actionsCss = `${rootCss} button[class*=actionMenuToggle]`;
const identifiers = MultiColumnList({ id:'list-identifiers' });
const editMARCBibRecordButton = Button({ id:'edit-instance-marc' });
const viewSourceButton = Button({ id:'clickable-view-source' });


export default {
  // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
  validOCLC : { id:'176116217',
    getLastRowNumber:() => 31 },
  checkExpectedOCLCPresence: (OCLCNumber) => {
    cy.expect(identifiers.find(HTML(including(OCLCNumber))).exists());
  },

  goToEditMARCBiblRecord:() => {
    cy.get(actionsCss, getLongDelay()).click();
    cy.do(editMARCBibRecordButton.click());
  },

  viewSource: () => {
    cy.get(actionsCss, getLongDelay()).click();
    cy.do(viewSourceButton.click());
  }
};
