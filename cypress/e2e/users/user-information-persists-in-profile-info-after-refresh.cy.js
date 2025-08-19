import Users from '../../support/fragments/users/users';
import ProfileInfo from '../../support/fragments/users/profileInfo';

describe('Users', () => {
  describe('Profile info', () => {
    const testData = { user: {} };

    before('Create user and login', () => {
      cy.createTempUser().then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password);
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C503132 User information is displayed in profile info after page refresh (volaris)',
      { tags: ['extendedPath', 'volaris', 'C503132'] },
      () => {
        // Step 1 Click on "Profile info" icon in top-right corner of the page
        ProfileInfo.openAndVerify(testData.user.firstName, testData.user.lastName);
        ProfileInfo.close();

        // Step 2 Refresh the page and click on "Profile info" icon after loading
        cy.reload();
        ProfileInfo.openAndVerify(testData.user.firstName, testData.user.lastName);
        cy.waitForAuthRefresh(() => {}, 20_000);
        ProfileInfo.verifyLogoutButtonPresent();
      },
    );
  });
});
