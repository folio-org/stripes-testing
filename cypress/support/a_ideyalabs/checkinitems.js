import { Button, Checkbox, MultiColumnList, MultiColumnListCell, PaneContent } from '../../../interactors';
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
      // alert("First Iteration")
      const barcode2 = value[0].innerText;
      console.log(barcode2);
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
    // cy.do(
    //   button({
    //     id: "accordion-toggle-button-74b0fd65-57a6-443d-8cb6-1ff585471f63",
    //   }).click()
    // );
    // cy.xpath("(//span[@class='appIcon---m1ayU small---gZXwD icon-alignment-center---nDpym']//span[@class='label---zHSX1'])[2]").then((value) => {
    // alert('First Iteration')
    // const data = value[0].innerText;
    //   console.log(data)
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
      // console.log(vari)
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(test);
      serviceshift.clickClose();
    });
  },

  //     checkout(){
  // cy.xpath(patroncode).type(patronid);
  //         cy.do(button({ id: "clickable-find-patron" }).click());
  //         serviceshift.clickClose();
  //          cy.xpath(itempath).click().type(itemid)
  //         cy.do(button({id:"clickable-add-item"}).click())
  //         serviceshift.clickClose();
  //         cy.visit(topMenu.checkOutPath);
  //         cy.xpath(patroncode).type(patronid);
  //         cy.do(button({ id: "clickable-find-patron" }).click());
  //         cy.xpath(itempath).click().type(itemid)
  //         serviceshift.clickClose();
  //         cy.do(button({id:"clickable-add-item"}).click())
  //         serviceshift.clickClose();

  //     }


};
