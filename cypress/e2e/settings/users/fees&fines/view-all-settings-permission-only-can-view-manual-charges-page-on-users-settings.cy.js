import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import UsersSettingsGeneral from '../../../../support/fragments/settings/users/usersSettingsGeneral';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Fees&Fines', () => {
  describe('Settings Users (Fee/fine)', () => {
    let userData;
    const testData = {
      userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const ownerOne = {
      id: uuid(),
      owner: getTestEntityValue('Owner1'),
      servicePointOwner: [
        {
          value: testData.userServicePoint.id,
          label: testData.userServicePoint.name,
        },
      ],
    };
    const ownerTwo = {
      id: uuid(),
      owner: getTestEntityValue('Owner2'),
      servicePointOwner: [
        {
          value: testData.userServicePoint.id,
          label: testData.userServicePoint.name,
        },
      ],
    };

    before('Preconditions', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        UsersOwners.createViaApi(ownerOne);
        UsersOwners.createViaApi(ownerTwo);
        ManualCharges.createViaApi({
          defaultAmount: '10',
          automatic: false,
          feeFineType: getTestEntityValue('ChargeUsers'),
          ownerId: ownerOne.id,
        }).then((chargeRes) => {
          testData.manualCharge = chargeRes;
        });
        cy.createTempUser([permissions.uiUsersViewAllSettings.gui]).then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );
          cy.login(userData.username, userData.password, {
            path: SettingsMenu.manualCharges,
            waiter: ManualCharges.waitLoading,
            authRefresh: true,
          });
        });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      ManualCharges.deleteViaApi(testData.manualCharge.id);
      UsersOwners.deleteViaApi(ownerOne.id);
      UsersOwners.deleteViaApi(ownerTwo.id);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
      ServicePoints.deleteViaApi(testData.userServicePoint.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C407703 User with "Settings (Users): View all settings" permission only can view "Manual Charges" page on "Users > Settings" - when system has at leaset 2 Fee/Fine owners (only one owner has configured "Fee/Fine Manual Charge") (volaris)',
      { tags: ['extendedPath', 'volaris', 'C407703'] },
      () => {
        ManualCharges.selectOwner(ownerOne);
        ManualCharges.checkDefaultEditButtonIsDisabled();
        ManualCharges.checkManualCharge({ ...testData.manualCharge, amount: '10.00' });
        UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();

        ManualCharges.selectOwner(ownerTwo);
        ManualCharges.checkDefaultEditButtonIsDisabled();
        SettingsPane.checkAddNewBtnAbsent();
        ManualCharges.checkEmptyTableContent('There are no Fee/fine: Manual charges');
      },
    );
  });
});
