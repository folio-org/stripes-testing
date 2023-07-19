import { Button, Checkbox, TextField } from "../../../interactors";
import button from "../../../interactors/button";
import checkInActions from "../fragments/check-in-actions/checkInActions";
import checkout from "../fragments/checkout/checkout";
import inventorySearchAndFilter from "../fragments/inventory/inventorySearchAndFilter";
import topMenu from "../fragments/topMenu";
import serviceshift from "./serviceshift";

const checkOut = TextField({ id: "input-patron-identifier" });
const items = '//a[@id="segment-navigation-items"]';
const declaredTextFiled =
  "//label[text()='itemStatus-field']/following-sibling::*//input";
export default {
  clickonitem() {
    cy.do(items).click();
  },

  declareditem() {
    cy.do(button({ id: "accordion-toggle-button-itemStatus" }).click());
    cy.wait(3000);
    cy.do([declaredTextFiled.click(), declaredTextFiled.fillIn("decla")]);
    cy.wait(3000);
    cy.do([
      Checkbox({ id: "clickable-filter-itemStatus-declared-lost" }).click(),
    ]);
    inventorySearchAndFilter.selectSearchResultItem();
    cy.do(
      button({
        id: "accordion-toggle-button-3f94ccd4-8618-44bb-94f1-484273862fad",
      }).click()
    );
    cy.wait(3000);
    cy.xpath(
      "(//span[@class='appIcon---m1ayU small---gZXwD icon-alignment-center---nDpym'])[33]"
    ).then((value) => {
      // alert("First Iteration")
      const barcode2 = value[0].innerText;
      console.log(barcode2);
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(barcode2);
      serviceshift.clickClose();
    });
    // cy.do(Button("Confirm").click())
  },

  withdrawn() {
    inventorySearchAndFilter.switchToItem();
    cy.do(button({ id: "accordion-toggle-button-itemStatus" }).click());
    cy.do([declaredTextFiled.click(), declaredTextFiled.fillIn("withdrawn")]);
    cy.do([Checkbox({ id: "clickable-filter-itemStatus-withdrawn" }).click()]);
    inventorySearchAndFilter.selectSearchResultItem();
    cy.do(
      button({
        id: "accordion-toggle-button-3f94ccd4-8618-44bb-94f1-484273862fad",
      }).click()
    );
    // cy.do(
    //   cy.log(PaneContent({id: 'pane-instancedetails-content'}).find(MultiColumnList()).find(MultiColumnListCell('Withdrawn')).text)
    // )
    cy.xpath(
      "(//span[@class='appIcon---m1ayU small---gZXwD icon-alignment-center---nDpym']//span[@class='label---zHSX1'])[13]"
    ).then((value) => {
      // alert('First Iteration')
      const data = value[0].innerText;
      console.log(data);
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(data);
      serviceshift.clickClose();
    });
  },

  lostandpaid() {
    inventorySearchAndFilter.switchToItem();
    cy.do(button({ id: "accordion-toggle-button-itemStatus" }).click());
    cy.wait(3000);
    cy.do([declaredTextFiled.click(), declaredTextFiled.fillIn("lost and")]);
    cy.wait(3000);
    cy.do([
      Checkbox({ id: "clickable-filter-itemStatus-lost-and-paid" }).click(),
    ]);

    inventorySearchAndFilter.selectSearchResultItem();
    cy.do(
      button({
        id: "accordion-toggle-button-0d72a9c3-78e7-4f78-87e1-6242e5be3370",
      }).click()
    );
    cy.xpath(
      "(//span[@class='appIcon---m1ayU small---gZXwD icon-alignment-center---nDpym']//span[@class='label---zHSX1'])[2]"
    ).then((vari) => {
      const test = vari[0].innerText;
      // console.log(vari)
      cy.visit(topMenu.checkInPath);
      checkInActions.checkInItem(test);
      serviceshift.clickClose();
    });
  },
  enterpatronBardcodeCheckout: (patronbarcode) => {
    cy.do([
      checkOut.fillIn(patronbarcode),
      cy.wait(3000),
      PatronButton.click(),
      Modal("Patron blocked from borrowing").find(Button("Close")).click(),
    ]);
  },

  enteritemBardcodeCheckout: (searchitembarcode) => {
    cy.do([
      itembarcode.fillIn(searchitembarcode),
      ItemButton.click(),
      Modal("Patron blocked from borrowing").find(Button("Close")).click(),
    ]);
  },

  selectRenewed: () => {
    cy.expect(Pane({ title: "Circulation log" }).exists());
    cy.do([
      Accordion({ id: "loan" }).clickHeader(),
      Checkbox({
        id: "clickable-filter-loan-renewed-through-override",
      }).click(),
    ]);
  },
};
