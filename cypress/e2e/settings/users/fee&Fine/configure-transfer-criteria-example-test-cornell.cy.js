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

    it("should be able to set transfer account data to", () => {
    TransferFeeFine.setTransferAccount("Lost Item Fine Office", "acct");
  });

  // Header Format
  it("should be able to set header format", () => {
    // remove all current header options
    cy.do([
      Button({ icon: "trash" }).click(),
      Button({ icon: "trash" }).click(),
      Button({ icon: "trash" }).click(),
    ]);
  });

  // Account Data Format

  // Footer Format

  // Transer account data to
  it("should be able to set transfer account data to", () => {
    TransferFeeFine.setTransferAccount("Lost Item Fine Office", "acct");
  });

  it("should be able to run manually", () => {
    //TransferFeeFine.runManually();
  });

});
