import { Button } from "@interactors/html";
import { getCurrentDate } from "../../../plugins/dateTools";
import { getRandomPostfix } from "../../../plugins/stringTools";

export class NewAgreement{

    static #rootCss = 'section[id="pane-agreement-form"]'
    static #nameCss = `${NewAgreement.#rootCss} input[name="name"]`;
    static #statusCss = `${NewAgreement.#rootCss} select[id="edit-agreement-status"]`;
    static #startDateCss = `${NewAgreement.#rootCss} input[id="period-start-date-0"]`;
    static #saveButton = Button('Save & close');

    static #statusValue = {
        closed: 'Closed',
        draft: 'Draft',
        requested: 'Requested',
        inNegotiation: 'In negotiation',
        active: 'Active',
    }
    
    static #defaultAgreement = {
        name: `autotest_agreement_${getRandomPostfix()}`,
        status: NewAgreement.#statusValue.draft,
        startDate: getCurrentDate()
    }

    static get defaultAgreement(){
        return NewAgreement.#defaultAgreement;
    }


    static fill(specialAgreement = this.#defaultAgreement){
        cy.get(NewAgreement.#nameCss).type(specialAgreement.name);
        cy.get(NewAgreement.#statusCss)
        .select(specialAgreement.status)
        .should('have.value', specialAgreement.status.toLowerCase());
        cy.get(NewAgreement.#startDateCss).type(specialAgreement.startDate);
    }

    static save(){
        cy.do(NewAgreement.#saveButton.click());
    }

    static waitLoading(){
        cy.get(NewAgreement.#nameCss).should('exist');
    }
}