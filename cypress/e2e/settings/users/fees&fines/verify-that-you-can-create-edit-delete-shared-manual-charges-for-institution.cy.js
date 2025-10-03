import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import ManualCharges from '../../../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../support/fragments/topMenu';
import NewFeeFine from '../../../../support/fragments/users/newFeeFine';
import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Settings Users (Fee/fine)', () => {
    const owners = [
      { id: uuid(), owner: 'Shared' },
      { id: uuid(), owner: getTestEntityValue('Owners_1') },
      { id: uuid(), owner: getTestEntityValue('Owners_2') },
    ];
    const feeFineType = [];
    const ownersData = [];
    let user;
    const ownerError = 'Fee/fine type exists for other Fee/fine owner(s)';
    const ownerSharedError = 'Fee/fine type exists for Shared Fee/fine owner';
    const amount = '100.00';

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
            defaultAmount: amount,
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

      feeFineType.forEach((item) => {
        ManualCharges.deleteViaApi(item.id);
      });
      ownersData.forEach((item) => {
        UsersOwners.deleteViaApi(item.id);
      });
    });

    it(
      'C443 Verify that you can create/edit/delete "Shared" manual charges for institution (Spitfire) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C443'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.visit(SettingsMenu.manualCharges);
          ManualCharges.waitLoading();
        });
        ManualCharges.checkSelectedOwner(owners[0].owner);

        owners.forEach((owner) => {
          ManualCharges.checkOwnersDropdownIncludesOption(owner.owner);
        });

        ManualCharges.createViaUi({
          feeFineType: feeFineType[1].name,
          amount,
        });
        ManualCharges.checkValidatorError({ error: ownerError });
        ManualCharges.clickCancelBtn();

        ManualCharges.selectOwnerByName(owners[1].owner);
        ManualCharges.createViaUi({
          feeFineType: feeFineType[0].name,
          amount,
        });
        ManualCharges.checkValidatorError({ error: ownerSharedError });
        ManualCharges.clickCancelBtn();

        cy.intercept('POST', '/feefines').as('manualChargeCreate');
        ManualCharges.selectOwnerByName(owners[1].owner);
        ManualCharges.createViaUi({
          feeFineType: feeFineType[2].name,
          amount,
        });
        cy.wait('@manualChargeCreate').then((intercept) => {
          feeFineType.push({
            amount,
            id: intercept.response.body.id,
            name: feeFineType[2].name,
          });
        });

        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();
        UsersSearchPane.searchByKeywords(user.username);

        UsersCard.waitLoading();
        UsersCard.openFeeFines();
        UsersCard.startFeeFineAdding();
        NewFeeFine.setFeeFineOwner(owners[1].owner);

        NewFeeFine.checkFeeFineOwnerExist(owners[0].owner, false);
        NewFeeFine.setFeeFineOwner(owners[1].owner);
        NewFeeFine.checkFilteredFeeFineType(feeFineType[0].name);
        NewFeeFine.setFeeFineOwner(owners[2].owner);
        NewFeeFine.checkFilteredFeeFineType(feeFineType[0].name);
      },
    );
  });
});
