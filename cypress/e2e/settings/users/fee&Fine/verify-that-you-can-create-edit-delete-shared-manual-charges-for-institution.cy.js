import uuid from 'uuid';
import { DevTeams, TestTypes } from '../../../../support/dictionary';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import ManualCharges from '../../../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../../../support/fragments/topMenu';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../../support/fragments/users/usersCard';
import NewFeeFine from '../../../../support/fragments/users/newFeeFine';
import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';

describe('Users: Owners', () => {
  const owners = [
    { id: uuid(), owner: 'Shared' },
    { id: uuid(), owner: 'Owners' },
    { id: uuid(), owner: 'Owners2' },
  ];
  const feeFineType = [];
  const ownersData = [];
  let user;
  const ownerError = 'Fee/fine type exists for other Fee/fine owner(s)';
  const ownerSharedError = 'Fee/fine type exists for Shared Fee/fine owner';

  before('Create test data', () => {
    cy.getAdminToken();
    cy.loginAsAdmin({
      path: SettingsMenu.usersOwnersPath,
      waiter: UsersOwners.waitLoading,
    });

    owners.forEach((ownerUser) => UsersOwners.createViaApi(ownerUser)
      .then(({ id, owner }) => {
        ownersData.push({
          name: owner,
          id,
        });
      })
      .then(() => {
        ManualCharges.createViaApi({
          defaultAmount: '100.00',
          automatic: false,
          feeFineType: `Manual_charge-${ownerUser.owner}`,
          ownerId: ownerUser.id,
        }).then((manualCharge) => {
          feeFineType.push({
            id: manualCharge.id,
            name: `Manual_charge-${ownerUser.owner}`,
            amount: manualCharge.amount,
          });
        });
      }));

    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditUpdateRecords.gui,
      permissions.uiUsersView.gui,
      permissions.uiUserEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);

    cy.wrap(feeFineType).each((item) => {
      ManualCharges.deleteViaApi(item.id);
    });

    ManualCharges.selectOwnerByName(owners[1].owner);
    cy.get('@manualChargeId').then((manualChargeId) => {
      ManualCharges.deleteViaApi(manualChargeId);
    });

    cy.visit(SettingsMenu.usersOwnersPath);
    cy.wrap(ownersData).each((item) => {
      UsersOwners.deleteViaApi(item.id);
    });
  });

  it(
    '443 - Verify that you can create/edit/delete "Shared" manual charges for institution (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      cy.visit(SettingsMenu.manualCharges);
      ManualCharges.waitLoading();
      ManualCharges.checkSelectedOwner(owners[0].owner);
      owners.forEach((owner) => {
        ManualCharges.checkSelectContainsOwner(owner.owner);
      });

      ManualCharges.createViaUi({
        feeFineType: feeFineType[1].name,
        amount: '10.00',
      });
      ManualCharges.checkValidatorError({ error: ownerError });
      ManualCharges.clickCancelBtn();

      ManualCharges.selectOwnerByName(owners[1].owner);
      ManualCharges.createViaUi({
        feeFineType: feeFineType[0].name,
        amount: '10.00',
      });
      ManualCharges.checkValidatorError({ error: ownerSharedError });
      ManualCharges.clickCancelBtn();

      cy.intercept('POST', '/feefines').as('manualChargeCreate');
      ManualCharges.selectOwnerByName(owners[1].owner);
      ManualCharges.createViaUi({
        feeFineType: feeFineType[2].name,
        amount: '10.00',
      });
      cy.wait('@manualChargeCreate').then((intercept) => {
        cy.wrap(intercept.response.body.id).as('manualChargeId');
      });

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(user.username);

      UsersCard.waitLoading();
      UsersCard.openFeeFines();
      UsersCard.startFeeFineAdding();
      NewFeeFine.setFeeFineOwner(owners[1].owner);

      NewFeeFine.chekcFeeFineOwnerExist(owners[0].owner, false);
      NewFeeFine.setFeeFineOwner(owners[1].owner);
      NewFeeFine.checkFilteredFeeFineType(feeFineType[0].name);
      NewFeeFine.setFeeFineOwner(owners[2].owner);
      NewFeeFine.checkFilteredFeeFineType(feeFineType[0].name);
      cy.visit(SettingsMenu.manualCharges);
    },
  );
});
