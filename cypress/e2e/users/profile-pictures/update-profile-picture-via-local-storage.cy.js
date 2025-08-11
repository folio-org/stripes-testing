import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  describe('Profile pictures', () => {
    const testData = {
      externalPictureUrl:
        'https://png.pngtree.com/png-vector/20191101/ourmid/pngtree-cartoon-color-simple-male-avatar-png-image_1934459.jpg',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.getConfigurationsEntry().then((respBody) => {
        if (respBody.enabled === false) {
          respBody.enabled = true;
          cy.updateConfigurationsEntry(respBody.id, respBody);
        }
      });

      // create user B
      cy.createTempUser().then((userProperties) => {
        testData.userB = userProperties;
      });

      // create user A
      cy.createTempUser([Permissions.uiUserViewEditDeliteProfilePictores.gui]).then(
        (userProperties) => {
          testData.userA = userProperties;

          cy.login(testData.userA.username, testData.userA.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        },
      );
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
    });

    it(
      'C446093 Update profile picture via local storage (volaris)',
      { tags: ['smokeBroken', 'volaris', 'C446093'] },
      () => {
        UsersSearchPane.searchByUsername(testData.userB.username);
        UsersCard.waitLoading();
        UserEdit.openEdit();
        UserEdit.verifyPlaceholderProfilePictureIsPresent();
        UserEdit.verifyButtonsStateForProfilePicture([{ value: 'Local file' }]);
        // steps 10-11 we can't automate
        UserEdit.setPictureFromExternalUrl(testData.externalPictureUrl);
        UserEdit.verifyProfilePictureIsPresent(testData.externalPictureUrl);
        cy.wait(3000);
        UserEdit.saveAndClose();
        UsersCard.waitLoading();
        // UsersCard.verifyProfilePictureIsPresent(testData.externalPictureUrl);
      },
    );
  });
});
