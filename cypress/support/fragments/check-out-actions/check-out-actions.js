import TopMenu from "../topMenu";
import {
  TextField,
  Button,
  Modal,
  KeyValue,
  MultiColumnListRow,
  Form,
  TextArea,
} from "../../../../interactors";

export default {
  checkOutItem(userBarcode, itemBarcode) {
    cy.visit(TopMenu.checkOutPath);
    cy.do([
      TextField({ name: "patron.identifier" }).fillIn(userBarcode),
      Button({ id: "clickable-find-patron" }).click(),
    ]);
    cy.expect(KeyValue("Borrower").exists());
    cy.do([
      TextField({ name: "item.barcode" }).fillIn(itemBarcode),
      Button({ id: "clickable-add-item" }).click(),
      Modal().find(Button("Check out")).click(),
      // Uncomment
      // Button("End session").click(),
    ]);
    // cy.expect(MultiColumnListRow().exists());
  },
  overrideLoanPolicy() {
    cy.do([
      Button("Override").click(),
      Form({ id: "override-form" })
        .find(TextArea({ id: "textarea-input-8" }))
        .fillIn("Test_comment"),
      Button("Save & close").click(),
      Button("End session").click(),
    ]);
  },
};
