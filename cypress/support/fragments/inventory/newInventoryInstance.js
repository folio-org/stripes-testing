import { MultiColumnList, HTML, including, Button } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

export default class NewInventoryInstance {
    static #validOCLC = { id:'176116217',
    // TODO: hardcoded count related with interactors getters issue. Redesign to cy.then(QuickMarkEditor().rowsCount()).then(rowsCount => {...}
      getLastRowNumber:() => 31 };

    static #rootCss = 'section[id=pane-instancedetails]';
    // TODO: rewrite to interactor with filter by id
    static #actionsCss = `${this.#rootCss} button[class*=actionMenuToggle]`;
    static #identifiers = MultiColumnList({ id:'list-identifiers' });
    static #editMARCBibRecordButton = Button({ id:'edit-instance-marc' });
    static #viewSourceButton = Button({ id:'clickable-view-source' });


    static get validOCLC() {
      return this.#validOCLC;
    }

    static checkExpectedOCLCPresence(OCLCNumber) {
      cy.expect(this.#identifiers.find(HTML(including(OCLCNumber))).exists());
    }

    static goToEditMARCBiblRecord() {
      cy.get(this.#actionsCss, getLongDelay()).click();
      cy.do(this.#editMARCBibRecordButton.click());
    }

    static viewSource() {
      cy.get(this.#actionsCss, getLongDelay()).click();
      cy.do(this.#viewSourceButton.click());
    }
}
