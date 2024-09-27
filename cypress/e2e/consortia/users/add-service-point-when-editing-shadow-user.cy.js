import Affiliations from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';

const testData = {};
const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

describe('Users', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(servicePoint);
    cy.resetTenant();
    cy.createTempUser(
      [
        Permissions.consortiaSettingsConsortiaAffiliationsEdit.gui,
        Permissions.uiUserCanAssignUnassignPermissions.gui,
        Permissions.uiUsersEdituserservicepoints.gui,
        Permissions.uiUserEdit.gui,
      ],
      '',
      'staff',
    ).then((userProperties) => {
      testData.user1 = userProperties;
      cy.assignAffiliationToUser(Affiliations.College, testData.user1.userId);
      cy.setTenant(Affiliations.College);
      cy.assignPermissionsToExistingUser(testData.user1.userId, [
        Permissions.uiUserCanAssignUnassignPermissions.gui,
        Permissions.uiUsersEdituserservicepoints.gui,
        Permissions.uiUserEdit.gui,
      ]);
    });
    cy.resetTenant();
    cy.createTempUser([], '', 'staff').then((userProperties) => {
      testData.user2 = userProperties;
      cy.assignAffiliationToUser(Affiliations.College, testData.user2.userId);
    });
  });

  after('Delete test data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(testData.user2.userId, [servicePoint.id]);
    ServicePoints.deleteViaApi(servicePoint.id);
    Users.deleteViaApi(testData.user1.userId);
    Users.deleteViaApi(testData.user2.userId);
  });

  it(
    'C422215 Add service point when editing shadow user (consortia) (thunderjet)',
    { tags: ['criticalPathECS', 'thunderjet'] },
    () => {
      cy.login(testData.user1.username, testData.user1.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
      UsersSearchPane.searchByUsername(testData.user2.username);
      UserEdit.checkAccordionsForShadowUser();
      UserEdit.checkActionsForShadowUser();
      UserEdit.openEdit();
      UserEdit.checkAccordionsForShadowUserInEditMode();
      UserEdit.addServicePoints(servicePoint.name);
      UserEdit.selectPreferableServicePoint(servicePoint.name);
      UserEdit.saveAndClose();
      UserEdit.openServicePointsAccordion();
      UserEdit.checkServicePoints(servicePoint.name);
    },
  );
});
