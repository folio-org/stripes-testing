import { enableProfilePictures } from '../../../support/fragments/users/profilePicture';
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
        'https://hips.hearstapps.com/hmg-prod/images/bright-forget-me-nots-royalty-free-image-1677788394.jpg?crop=0.535xw:1.00xh;0.359xw,0&resize=980:*',
      newExternalPictureUrl:
        'https://hips.hearstapps.com/hmg-prod/images/bright-me-nots-royalty-free-image-1677788394.jpg?crop=0.535xw:1.00xh;0.359xw,0&resize=980:*',
      invalidExternalPictureUrl:
        'https//hips.hearstapps.com/hmg-prod/images/bright-forget-me-nots-royalty-free-image-1677788394.jpg?crop=0.535xw:1.00xh;0.359xw,0&resize=980:*',
      validExternalPictureUrl:
        'https://kidlingoo.com/wp-content/uploads/flowers_name_in_english.jpg',
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      enableProfilePictures();

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
      'C442797 Verify that profile picture can be updated via URL (volaris)',
      { tags: ['criticalPath', 'volaris', 'C442797'] },
      () => {
        UsersSearchPane.searchByUsername(testData.userB.username);
        UsersCard.waitLoading();
        UserEdit.openEdit();
        UserEdit.verifyProfileCardIsPresented();
        UserEdit.verifyButtonsStateForProfilePicture([{ value: 'External URL' }]);
        UserEdit.setPictureFromExternalUrl(testData.externalPictureUrl);
        UserEdit.verifyProfilePictureIsPresent(testData.externalPictureUrl);
        UserEdit.saveAndClose();
        UsersCard.waitLoading();
        // UsersCard.verifyProfilePictureIsPresent(testData.externalPictureUrl);

        UserEdit.openEdit();
        UserEdit.verifyProfileCardIsPresented();
        UserEdit.verifyButtonsStateForProfilePicture([{ value: 'External URL' }]);
        UserEdit.setPictureFromExternalUrl(testData.newExternalPictureUrl, false);
        UserEdit.verifyModalWithInvalidUrl(
          'The provided URL is valid but does not point to an image file',
        );
        UserEdit.fillInExternalImageUrlTextField(testData.invalidExternalPictureUrl);
        UserEdit.clickSaveButton();
        UserEdit.verifyModalWithInvalidUrl('Invalid image URL');

        UserEdit.clearExternalImageUrlTextField();
        UserEdit.fillInExternalImageUrlTextField(testData.validExternalPictureUrl);
        UserEdit.clickSaveButton();
        cy.wait(3000);
        UserEdit.saveAndClose();
        UsersCard.waitLoading();
        // UsersCard.verifyProfilePictureIsPresent(testData.validExternalPictureUrl);
      },
    );
  });
});
