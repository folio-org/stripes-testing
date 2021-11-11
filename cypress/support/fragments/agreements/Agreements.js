import { Button } from '../../../../interactors';
import NewAgreement from './newAgreement';
import AgreementDetails from './agreementsDetails';

class Agreements {
  static #rootXpath = '//div[@id="agreements-module-display"]';
  static #rowXpath = `${this.#rootXpath}//div[contains(@class,'mclRow')][@role='row']`;
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
    cy.xpath(this.#rowXpath)
      .should('be.visible');
  }

  static selectRecord(recordName = NewAgreement.defaultAgreement.name) {
    cy.xpath(`${this.#labelCellXpath}[.='${recordName}']`)
      .click();
    AgreementDetails.waitLoading();
  }
}

export default Agreements;
