import permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
  let userData;
  let servicePointId;
  const patronGroup = {
    name: getTestEntityValue('groupUserPronouns'),
  };

  const firstPronouns = 'She';
  const preferredName = 'preferredName';
  const testMiddleName = 'testMiddleName';
  const specialCharacterPronouns = 'Они%';
  const thirdPronouns = 'He';

  before('Data preparation', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
        servicePointId = servicePoint.id;
      });
      PatronGroups.createViaApi(patronGroup.name).then((patronGroupResponse) => {
        patronGroup.id = patronGroupResponse;
      });
      cy.createTempUser([permissions.uiUserEdit.gui], patronGroup.name).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(servicePointId, userData.userId, servicePointId);
      });
    });
  });

  before('Login', () => {
    cy.login(userData.username, userData.password, {
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
  });

  it(
    'C648467 Edit "Pronouns" field on user record (volaris)',
    { tags: ['criticalPath', 'volaris', 'C648467', 'eurekaPhase1'] },
    () => {
      // Search for the user and open their details
      UsersSearchPane.searchByUsername(userData.username);
      UsersCard.waitLoading();

      // Step 1: Click "Actions" -> "Edit" on user details pane
      UserEdit.openEdit();
      UserEdit.verifyPronounsFieldPresent();
      UserEdit.verifyPronounsFieldValue('');

      // Step 2-3: Place cursor on the "Pronouns" field/ Type pronouns
      UserEdit.focusPronounsField();
      UserEdit.fillPronouns(firstPronouns);

      // Step 4: Click on the "Save & close" button
      UserEdit.verifySaveButtonActive();
      UserEdit.saveAndClose();
      UsersCard.verifyPronounsOnUserDetailsPane(firstPronouns);
      UsersCard.verifyFullNameAndPronouns(
        'with',
        userData.lastName,
        preferredName,
        testMiddleName,
        firstPronouns,
      );

      // Step 5: Click "Actions" -> "Edit" on user details pane again
      UserEdit.openEdit();
      UserEdit.verifyUserFullNameWithPronouns(
        userData.lastName,
        preferredName,
        testMiddleName,
        firstPronouns,
      );
      UserEdit.verifyPronounsFieldValue(firstPronouns);

      // Step 6: Clear the "Pronouns" field using the "x" icon
      UserEdit.clearPronounsField();
      UserEdit.verifyPronounsFieldValue('');
      UserEdit.verifyPronounsFieldInFocus();

      // Step 7: Enter new value with special characters and different alphabets
      UserEdit.fillPronouns(specialCharacterPronouns);
      UserEdit.verifyPronounsFieldValue(specialCharacterPronouns);

      //   // Step 8: Click on the "Save & close" button
      UserEdit.verifySaveButtonActive();
      UserEdit.saveAndClose();
      UsersCard.verifyPronounsOnUserDetailsPane(specialCharacterPronouns);
      UsersCard.verifyFullNameAndPronouns(
        'with',
        userData.lastName,
        preferredName,
        testMiddleName,
        specialCharacterPronouns,
      );

      // Step 9: Test cancel functionality - enter another value but cancel
      UserEdit.openEdit();
      UserEdit.fillPronouns(thirdPronouns);
      UserEdit.cancelEdit();
      UserEdit.cancelChanges();
      UsersCard.verifyPronounsOnUserDetailsPane(specialCharacterPronouns);
      UsersCard.verifyFullNameAndPronouns(
        'with',
        userData.lastName,
        preferredName,
        testMiddleName,
        specialCharacterPronouns,
      );

      // Step 10: Clear the "Pronouns" field completely
      UserEdit.openEdit();
      UserEdit.clearPronounsField();
      UserEdit.verifyPronounsFieldValue('');

      // Step 11: Click on the "Save & close" button
      UserEdit.verifySaveButtonActive();
      UserEdit.saveAndClose();
      UsersCard.verifyPronounsOnUserDetailsPane('No value set-');
      UsersCard.verifyFullNameAndPronouns(
        'without',
        userData.lastName,
        preferredName,
        testMiddleName,
      );
    },
  );
});
