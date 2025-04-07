import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import usersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  const testData = {
    user: {},
    testUser: {},
  };
  const servicePoint1 = ServicePoints.getDefaultServicePointWithPickUpLocation();
  const servicePoint2 = ServicePoints.getDefaultServicePointWithPickUpLocation();

  beforeEach('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(servicePoint1);
      ServicePoints.createViaApi(servicePoint2);

      cy.wrap(true)
        .then(() => {
          cy.createTempUser([Permissions.uiUsersEdituserservicepoints.gui]).then(
            (userProperties) => {
              testData.user = userProperties;
            },
          );
          cy.createTempUser([]).then((userProperties) => {
            testData.testUser = userProperties;
          });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });
  });

  afterEach('Deleting created users', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Users.deleteViaApi(testData.testUser.userId);
    UserEdit.changeServicePointPreferenceViaApi(testData.testUser.userId, [servicePoint1.id]);
    ServicePoints.deleteViaApi(servicePoint1.id);
    ServicePoints.deleteViaApi(servicePoint2.id);
  });

  it(
    'C424 Service Points: Assign multiple service points to a user (volaris)',
    { tags: ['criticalPath', 'volaris', 'C424'] },
    () => {
      UsersSearchPane.searchByUsername(testData.testUser.username);
      UserEdit.openEdit();
      UserEdit.openServicePointsAccordion();
      UserEdit.addServicePoints(servicePoint1.name, servicePoint2.name);
      UserEdit.selectPreferableServicePoint(servicePoint1.name);
      UserEdit.saveAndClose();
      usersCard.openServicePointsAccordion();
      usersCard.checkServicePoints(servicePoint1.name, servicePoint2.name);
    },
  );
});
