import {NewAgreement} from "./newAgreement";

class Agreements{

    static #rootCss = "div[id=agreements-module-display]";
    static #rootXpath = '//div[@id="agreements-module-display"]';
    static #newButtonCss = `${Agreements.#rootCss} a[role=button][id=clickable-new-agreement]`;
    static #rowXpath =  `${Agreements.#rootXpath}//div[contains(@class,'mclRow')][@role='row']`;
    static #rowCss =  `${Agreements.#rootCss} div[class*=mclRow][role=row]`;
    static #labelCellXpath = `${Agreements.#rowXpath}//span[contains(@class,label)]/div`;
    
    static create(specialAgreement = NewAgreement.defaultAgreement){
        cy.get(Agreements.#newButtonCss).click();
        NewAgreement.waitLoading();
        NewAgreement.fill(specialAgreement);
        NewAgreement.save();
        Agreements.waitLoading();

        cy.xpath(`${Agreements.#labelCellXpath}[.='${specialAgreement.name}']`)
        .should('be.visible');
    }

    static waitLoading(){
        cy.get(Agreements.#rowCss)
        .should('be.visible');
    }
}

export default Agreements;