import { Button } from '../../../../interactors';
import NewAgreement from './newAgreement';
import AgreementDetails from './agreementsDetails';
import { getLongDelay } from '../../utils/cypressTools';

export default class Agreements {
  static #rootXpath = '//div[@id="agreements-module-display"]';
  static #rowXpath = `${this.#rootXpath}//div[contains(@class,'mclRow')][@role='row']`;
  static #noRowsXpath = `${this.#rootXpath}//div[contains(@class,"noResultsMessageLabel")]`;
  static #labelCellXpath = `${this.#rowXpath}//span[contains(@class,label)]/div`;

  static #newButton = Button('New');

  static create(specialAgreement = NewAgreement.defaultAgreement) {
    cy.do(this.#newButton.click());
    NewAgreement.waitLoading();
    NewAgreement.fill(specialAgreement);
    NewAgreement.save();
    this.waitLoading();

    // TODO: check ability to wirk through interactors
    cy.xpath(`${this.#labelCellXpath}[.='${specialAgreement.name}']`)
      .should('be.visible');
  }

  static waitLoading() {
    cy.xpath(`${this.#rowXpath}|${this.#noRowsXpath}`, getLongDelay())
      .should('be.visible');
    cy.expect(this.#newButton.exists());
  }

  static selectRecord(recordName = NewAgreement.defaultAgreement.name) {
    cy.xpath(`${this.#labelCellXpath}[.='${recordName}']`)
      .click();
    AgreementDetails.waitLoading();
  }

  static agreementNotVisible(agreementTitle) {
    cy.xpath((`${this.#labelCellXpath}[.='${agreementTitle}']`), getLongDelay())
      .should('not.exist');
  }
}

