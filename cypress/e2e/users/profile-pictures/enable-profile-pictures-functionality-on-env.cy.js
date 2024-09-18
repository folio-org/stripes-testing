import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  describe('Profile pictures', () => {
    const testData = {};

    before('Create test data', () => {
      cy.createTempUser().then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C442795 Verify that profile picture and associated update options display appropriately with Users: Can view, edit, and delete profile pictures (volaris)',
      { tags: ['smoke', 'volaris'] },
      () => {
        cy.getAdminToken();
        cy.getConfigurationsEntry().then((respBody) => {
          const id = respBody.id;
          respBody.enabled = true;

          cy.updateConfigurationsEntry(id, respBody);
        });
        cy.loginAsAdmin({
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        UsersSearchPane.searchByUsername(testData.user.username);
        UsersCard.waitLoading();
        UsersCard.verifyPlaceholderProfilePictureIsPresent();
      },
    );
  });
});
