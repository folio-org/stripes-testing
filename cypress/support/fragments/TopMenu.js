import {Button} from '../../../interactors';

export class TopMenu{
   static #agreements = Button('Agreements');

   static  openAgreements(){
         cy.do(this.#agreements.click());
   } 

}