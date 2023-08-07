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

  // Criteria: No criteria(always run)
  it("should be able to set no criteria", () => {
    TransferFeeFine.setCriteria(false);
    
  });

  it("should be able to set scheduling", () => {
    TransferFeeFine.setTransferCriteriaScheduling(
      "Weeks",
      "1",
      "11:00 PM",
      "Monday"
    );
  });

  // Aggregate by patron: Box unchecked

  // Header Format
  it("should be able to set header format", () => {
    TransferFeeFine.setDataFormatSection();
  });

  // Account Data Format

  // Footer Format

  // Preview

  // Transfer Account to

  // Run manually/ save and run

  // Verify that the transfer was successful
});
