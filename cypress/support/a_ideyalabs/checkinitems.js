import { Checkbox } from '../../../interactors';
import button from '../../../interactors/button';
import textField from '../../../interactors/text-field';
import checkInActions from '../fragments/check-in-actions/checkInActions';
import inventorySearchAndFilter from '../fragments/inventory/inventorySearchAndFilter';
import topMenu from '../fragments/topMenu';
import serviceshift from './serviceshift';

const items = '//a[@id="segment-navigation-items"]';
const data = '114545699';
const itemid = 108204829;
const declaredTextFiled = textField('itemStatus-field');

export default {


  clickonitem() {
    cy.do(items).click();
  },


  declareditem() {
    cy.do(button({ id: 'accordion-toggle-button-itemStatus' }).click());
    cy.wait(3000);
    cy.do([declaredTextFiled.click(),
      declaredTextFiled.fillIn('decla')]);
    cy.wait(3000);
    cy.do([
      Checkbox({ id: 'clickable-filter-itemStatus-declared-lost' }).click(),
    ]);
    inventorySearchAndFilter.selectSearchResultItem();
    cy.do(
      button({
        id: 'accordion-toggle-button-3f94ccd4-8618-44bb-94f1-484273862fad',
      }).click(),
    );
    cy.wait(3000);
    cy.xpath("(//span[@class='appIcon---m1ayU small---gZXwD icon-alignment-center---nDpym'])[33]").then((value) => {
      const barcode2 = value[0].innerText;
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(barcode2);
      serviceshift.clickClose();
    });
  },
  withdrawn() {
    inventorySearchAndFilter.switchToItem();
    cy.do(button({ id: 'accordion-toggle-button-itemStatus' }).click());
    cy.do([declaredTextFiled.click(),
      declaredTextFiled.fillIn('withdrawn')]);

    cy.do([
      Checkbox({ id: 'clickable-filter-itemStatus-withdrawn' }).click(),
    ]);
    inventorySearchAndFilter.clickSearchResultItem();
    cy.visit(topMenu.checkInPath);
    checkInActions.checkInItem(data);
    serviceshift.clickClose();
  },
  lostandpaid() {
    inventorySearchAndFilter.switchToItem();
    cy.do(button({ id: 'accordion-toggle-button-itemStatus' }).click());
    cy.wait(3000);
    cy.do([declaredTextFiled.click(),
      declaredTextFiled.fillIn('lost and')]);
    cy.wait(3000);
    cy.do([
      Checkbox({ id: 'clickable-filter-itemStatus-lost-and-paid' }).click(),
    ]);
    inventorySearchAndFilter.selectSearchResultItem();
    cy.do(
      button({
        id: 'accordion-toggle-button-2deda853-f427-46e5-b351-7997d01db96d',
      }).click()
    );
    cy.xpath("(//span[@class='appIcon---m1ayU small---gZXwD icon-alignment-center---nDpym']//span[@class='label---zHSX1'])[2]").then((vari) => {
      const test = vari[0].innerText;
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(test);
      serviceshift.clickClose();
    });
  },
};
