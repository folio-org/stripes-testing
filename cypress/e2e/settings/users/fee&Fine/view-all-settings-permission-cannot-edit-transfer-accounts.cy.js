import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../../../support/fragments/settings/users/patronGroups';
import TransferAccounts from '../../../../support/fragments/settings/users/transferAccounts';
import UsersOwners from '../../../../support/fragments/settings/users/usersOwners';
import UsersSettingsGeneral from '../../../../support/fragments/settings/users/usersSettingsGeneral';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

describe('Settings Users', () => {
  const patronGroup = {
    name: getTestEntityValue('groupToTestSettingsUsers'),
  };
  let userData;
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const userOwnerBody = {
    id: uuid(),
    owner: getTestEntityValue('AutotestOwner'),
    servicePointOwner: [
      {
        value: testData.userServicePoint.id,
        label: testData.userServicePoint.name,
      },
    ],
  };
  const transferAccount = TransferAccounts.getDefaultNewTransferAccount(uuid());

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.userServicePoint);
    });

    UsersOwners.createViaApi(userOwnerBody);
    TransferAccounts.createViaApi({ ...transferAccount, ownerId: userOwnerBody.id });

    PatronGroups.createViaApi(patronGroup.name).then((group) => {
      patronGroup.id = group;
      cy.createTempUser([permissions.uiUsersViewAllSettings.gui], patronGroup.name).then(
        (userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );

          cy.login(userData.username, userData.password);
        },
      );
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    TransferAccounts.deleteViaApi(transferAccount.id);
    UsersOwners.deleteViaApi(userOwnerBody.id);
  });

  it(
    'C407704 User with "Setting (Users): View all settings" permission cannot edit transfer accounts (volaris)',
    { tags: ['criticalPath', 'volaris'] },
    () => {
      cy.visit(SettingsMenu.transferAccounts);
      UsersSettingsGeneral.checkEntityInTable({
        name: transferAccount.accountName,
        description: transferAccount.desc,
        ownerName: userOwnerBody.owner,
      });
      UsersSettingsGeneral.checkEditDeleteNewButtonsNotDisplayed();
    },
  );
});
