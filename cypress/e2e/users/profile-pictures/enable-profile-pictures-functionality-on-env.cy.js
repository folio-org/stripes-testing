import { enableProfilePictures } from '../../../support/fragments/users/profilePicture';
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
      'C514930 Enable profile pictures functionality on environment (volaris)',
      { tags: ['smoke', 'volaris', 'C514930'] },
      () => {
        cy.getAdminToken();
        enableProfilePictures();
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
