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
  const newMiddleName = getTestEntityValue('newMiddleName');
  const patronGroup = {
    name: getTestEntityValue('groupUserMetadata'),
  };
  before('Preconditions', () => {
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

  beforeEach('Login', () => {
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
    'C428 Validate metadata accordion after updating a user (volaris)',
    { tags: ['extendedPath', 'volaris', 'C428'] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      UsersCard.openLastUpdatedInfo();
      UserEdit.openEdit();

      UserEdit.changeMiddleName(newMiddleName);
      UserEdit.saveAndClose();

      Users.verifyMiddleNameOnUserDetailsPane(newMiddleName);
      UsersCard.openLastUpdatedInfo();
      UsersCard.verifyLastUpdatedDate();
      UsersCard.verifyLastUpdatedSource(userData.username);
    },
  );
});
