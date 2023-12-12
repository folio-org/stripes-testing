import Permissions from '../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import SettingsMenu from '../../support/fragments/settingsMenu';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';

describe('Users -> Consortia', () => {
  const createUserData = () => ({
    username: getTestEntityValue('username'),
    barcode: getRandomPostfix(),
    personal: {
      firstName: getTestEntityValue('firstname'),
      preferredFirstName: getTestEntityValue('prefname'),
      middleName: getTestEntityValue('midname'),
      lastName: getTestEntityValue('lastname'),
      email: 'test@folio.org',
    },
    patronGroup: 'undergrad (Undergraduate Student)',
    userType: 'Staff',
  });
  const testUser = createUserData();

  let user;

  before('Create users, data', () => {
    cy.getAdminToken();

    cy.createTempUser([Permissions.consortiaSettingsSettingsMembershipEdit.gui])
      .then((userProperties) => {
        user = userProperties;
      })
      .then(() => {
        cy.setTenant(Affiliations.Consortia);
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.consortiaSettingsSettingsMembershipEdit.gui,
        ]);
        cy.login(user.username, user.password, {
          path: SettingsMenu.consortiumManagerPath,
          waiter: ConsortiumManager.waitLoading,
        });
      });
  });

  // after('Delete users, data', () => {
  //   cy.resetTenant();
  //   cy.getAdminToken();
  //   Users.deleteViaApi(user.userId);
  //   Users.deleteViaApi(testUser.id);
  // });

  it(
    'C380515: Edit address (tenant) name in "Consortium manager" settings (consortia)(thunderjet)',
    { tags: ['smoke', 'thunderjet'] },
    () => {
      Users.createViaUi(testUser).then((id) => {
        testUser.id = id;
      });
      ConsortiumManager.switchActiveAffiliation(tenantNames.central);
      UsersSearchPane.searchByUsername(testUser.username);
      Users.verifyUserDetailsPane();
      UsersCard.verifyAffiliationsQuantity('2');
      UsersCard.expandAffiliationsAccordion();
      UsersCard.verifyAffiliationsDetails('College', 2, 'Central Office');
    },
  );
});
