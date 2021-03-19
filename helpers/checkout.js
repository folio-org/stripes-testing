import { HTML } from "@bigtest/interactor";
import { or } from "@bigtest/interactor";
import {
  Button,
  Dropdown,
  TextField,
} from "@folio/stripes-testing/interactors";

const App = HTML.extend("app-container")
  .selector("main#ModuleContainer")
  .filters({
    name: (el) => {
      const app = Array.from(el.children).find((e) =>
        e.id.endsWith("-module-display")
      );
      return app?.id.substr(0, app.id.indexOf("-module-display"));
    },
  });

export const Home = HTML.extend("app").selector("main#ModuleContainer");

export const Nav = HTML.extend("Check out")
  .selector("header")
  .actions({
    open: async (interactor, app) => {
      await interactor
        .find(
          Button({
            id: `app-list-item-clickable-${app}-module`,
            visible: or(false, true),
          })
        )
        .click();
      await App({ name: app }).exists();
    },
    logout: async (interactor) => {
      await interactor.find(Dropdown("Online")).choose("Log out", true);
      await Button("Log in").exists();
    },
  });

const open = (el) =>
  el.querySelector("[aria-haspopup]").getAttribute("aria-expanded") ===
  "true";

const visible = (el) =>
  [el, el.querySelector(["[aria-haspopup]"])].every(isVisible);

const CheckedOutItems = HTML.extend("checked out items").selector(
  "#list-items-checked-out"
);

const CheckedOutItem = HTML.extend("checked out items")
  .selector('#list-items-checked-out [role="row"] [role="gridcell"]')
  .locator((e) => e.textContent)

export const Checkout = HTML.extend("Check out")
  .selector("checkout-module-display")
  .actions({
    checkout: async (interactor, itemBarcode, userBarcode) => {
      await interactor
        .find(TextField({ id: "input-patron-identifier" }))
        .fillIn(userBarcode);
      await interactor.find(Button({ id: "clickable-find-patron" })).click();
      await interactor.find(Button({ id: "clickable-done-footer" }));

      /*
    .wait(() => {
      const err = document.querySelector('#patron-form div[class^="textfieldError"]');
      if (err) {
        throw new Error(err.textContent);
      }
      return !!(document.querySelector('#patron-form ~ div a > strong'));
    })
*/
      await interactor
        .find(TextField({ id: "input-item-barcode" }))
        .fillIn(userBarcode);
      await interactor
        .find(Button({ id: "clickable-add-item" }))
        .click();
      await interactor.find(CheckedOutItems()).exists();
      await interactor.find(CheckedOutItem(userBarcode)).exists();
    },
  });

/**
 * checkout multiple items to a given user
 * @itemBarcodeList string[] an array of barcodes
 * @userBarcode string a user barcode
 */
const checkoutList = (itemBarcodeList, userBarcode) => {};
