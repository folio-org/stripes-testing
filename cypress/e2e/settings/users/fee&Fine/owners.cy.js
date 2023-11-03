import { DevTeams, TestTypes } from '../../../../support/dictionary';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import ManualCharges from '../../../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../../../support/fragments/topMenu';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../../support/fragments/users/usersCard';
import NewFeeFine from '../../../../support/fragments/users/newFeeFine';

describe('Users: Owners', () => {
  const owners = ['Shared', 'Owners', 'Owners2'];
  const manualCharges = owners.map((owner) => `Manual_charge-${owner}`);
  const user = 'Admin, user-basic-view';
  const ownerError = 'Fee/fine type exists for other Fee/fine owner(s)';
  const ownerSharedError = 'Fee/fine type exists for Shared Fee/fine owner';

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.usersOwnersPath,
      waiter: UsersOwners.waitLoading,
    });
    owners.forEach((owner) => {
      UsersOwners.startNewLineAdding();
      UsersOwners.fillOwner({ name: owner });
      UsersOwners.trySave();
    });
    cy.visit(SettingsMenu.manualCharges);
    ManualCharges.waitLoading();
    owners.forEach((owner) => {
      ManualCharges.selectOwnerByName(owner);
      ManualCharges.clickAddNewBtn();
      cy.wait(300);
      ManualCharges.fillInFields({
        feeFineType: `Manual_charge-${owner}`,
        amount: '100.00',
      });
    });
    cy.visit(SettingsMenu.usersOwnersPath);
  });

  after('Delete test data', () => {
    cy.visit(SettingsMenu.manualCharges);
    owners.forEach((owner) => {
      ManualCharges.selectOwnerByName(owner);
      ManualCharges.deleteViaUi({ feeFineType: `Manual_charge-${owner}` });
    });
    ManualCharges.selectOwnerByName(owners[1]);
    ManualCharges.deleteViaUi({ feeFineType: `Manual_charge-${owners[2]}` });
    cy.visit(SettingsMenu.usersOwnersPath);
    owners.forEach((owner) => {
      UsersOwners.deleteOwner(owner);
    });
  });

  it(
    '443 - Verify that you can create/edit/delete "Shared" manual charges for institution',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      cy.visit(SettingsMenu.manualCharges);
      ManualCharges.waitLoading();
      ManualCharges.checkSelectedOwner(owners[0]);
      owners.forEach((owner) => {
        ManualCharges.checkSelectItemOwner(owner);
      });

      ManualCharges.createViaUi({
        feeFineType: manualCharges[1],
        amount: '10.00',
      });
      ManualCharges.checkValidatorError({ error: ownerError });
      ManualCharges.clickCancelBtn();

      ManualCharges.selectOwnerByName(owners[1]);
      ManualCharges.createViaUi({
        feeFineType: manualCharges[0],
        amount: '10.00',
      });
      ManualCharges.checkValidatorError({ error: ownerSharedError });
      ManualCharges.clickCancelBtn();

      ManualCharges.selectOwnerByName(owners[1]);
      ManualCharges.createViaUi({
        feeFineType: manualCharges[2],
        amount: '10.00',
      });

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(user);

      UsersCard.waitLoading();
      UsersCard.openFeeFines();
      UsersCard.startFeeFineAdding();
      NewFeeFine.setFeeFineOwner(owners[1]);

      NewFeeFine.checkNotExistFeeFineOwner(owners[0]);
      NewFeeFine.setFeeFineOwner(owners[1]);
      NewFeeFine.checkFilteredFeeFineType(manualCharges[0]);
      NewFeeFine.setFeeFineOwner(owners[2]);
      NewFeeFine.checkFilteredFeeFineType(manualCharges[0]);
      cy.visit(SettingsMenu.manualCharges);
    },
  );
});
