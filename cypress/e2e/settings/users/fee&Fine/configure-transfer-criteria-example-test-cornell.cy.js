import TestTypes from "../../../../support/dictionary/testTypes";
import DevTeams from "../../../../support/dictionary/devTeams";
import settingsMenu from "../../../../support/fragments/settingsMenu";
import TransferFeeFine from "../../../../support/fragments/users/transferFeeFine";

describe("Build the Cornell bursar transfer file", () => {
  before(() => {
    cy.loginAsAdmin({
      path: settingsMenu.usersTransferCriteria,
      waiter: TransferFeeFine.waitLoadingTransferCriteria,
    });
  });

  it("should be able to open all the panes", () => {
    TransferFeeFine.openAllPanes();
  });

  it("should be able to set scheduling", () => {
    TransferFeeFine.setTransferCriteriaScheduling(
      "Weeks",
      "1",
      "11:00 PM",
      "Monday"
    );
  });

  it("should be able to set no criteria", () => {
    TransferFeeFine.setCriteria(false);
  });

  // Aggregate by patron: Box unchecked
  it("should be able to set aggregate by patron", () => {
    TransferFeeFine.setAggregateByPatron(false);
  });

  // Header Format
  it("should be able to set header format", () => {
    // get the parent element that contains text 'Header Format', then loop through its children and press the trash icon for each
    cy.get('.dropdown-menu:has("Header format")').parent().within(() => {
      cy.get("button[class^='iconButton']").each((el) => {
        cy.wrap(el).click();
      });
    }
    );


  });

  // Account Data Format

  // Footer Format



  it("should be able to run manually", () => {
    TransferFeeFine.runManually();
  });

});
