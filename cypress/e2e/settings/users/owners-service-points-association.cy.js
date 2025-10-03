import { Permissions } from '../../../support/dictionary';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('Settings', () => {
  describe('Users', () => {
    const testData = {
      owners: [],
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };

    beforeEach('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);

        // Create 3 owners
        for (let i = 0; i < 3; i++) {
          UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner()).then((owner) => {
            testData.owners.push(owner);
          });
        }

        // Create user with permissions
        cy.createTempUser([Permissions.uiUsersSettingsOwners.gui]).then((userProperties) => {
          testData.user = userProperties;
          cy.login(userProperties.username, userProperties.password, {
            path: SettingsMenu.usersOwnersPath,
            waiter: UsersOwners.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.owners.forEach((owner) => {
        if (owner?.id) {
          UsersOwners.deleteViaApi(owner.id);
        }
      });
      if (testData.user?.userId) {
        Users.deleteViaApi(testData.user.userId);
      }
      if (testData.servicePoint?.id) {
        ServicePoints.deleteViaApi(testData.servicePoint.id);
      }
    });

    it(
      'C503131 Verify that you can associate service points with Fee/fine owners (volaris)',
      { tags: ['extendedPath', 'volaris', 'C503131'] },
      () => {
        UsersOwners.startNewLineAdding();
        const newOwnerName = 'autotest_owner_' + new Date().getTime();
        UsersOwners.fillOwner({ name: newOwnerName });
        UsersOwners.verifyMultiSelectAppearance();

        UsersOwners.clickSaveBtn();
        UsersOwners.verifySuccessfulCallout('created');

        UsersOwners.editOwner(testData.owners[0].owner, { name: testData.owners[0].owner });
        UsersOwners.verifySuccessfulCallout('updated');

        UsersOwners.startEditOwner(testData.owners[1].owner, { name: testData.owners[1].owner });
        UsersOwners.selectMultipleServicePoints(testData.servicePoint.name);
        UsersOwners.clickSaveBtn();
        UsersOwners.verifySuccessfulCallout('updated');
        UsersOwners.verifyRemovedServicePoint(testData.owners[1].owner, testData.servicePoint.name);
      },
    );
  });
});
