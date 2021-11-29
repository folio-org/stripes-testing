import { MultiColumnList, HTML, including, Button } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

export default class NewInventoryInstance {
    static #validOCLC = '176116217';

    static #rootCss = 'section[id=pane-instancedetails]';
    static #actionsCss = `${this.#rootCss} button[class*=actionMenuToggle]`;
    static #identifiers = MultiColumnList({ id:'list-identifiers' });
    static #editMARCBibRecordButton = Button({ id:'edit-instance-marc' });

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
}
