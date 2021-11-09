class TopMenu{
   static #rootCss = 'div[class*="appList"]';
   static #agreementsButtonCss = `${this.#rootCss} a[id="app-list-item-clickable-agreements-module"]`; 

   static  openAgreements(){
         //TODO: redesign to interactors to provide more common steps descriptions into cypress report
         cy.get(TopMenu.#agreementsButtonCss).click()
   } 

}

export default TopMenu
