import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

const testData = {};
const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

describe('Users', () => {
  before('Create test data', () => {
    cy.getAdminToken();
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
      ServicePoints.createViaApi(servicePoint);

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
    Users.deleteViaApi(testData.user1.userId);
    Users.deleteViaApi(testData.user2.userId);
    cy.resetTenant();
    cy.setTenant(Affiliations.College);
    cy.wait(5000);
    ServicePoints.deleteViaApi(servicePoint.id);
  });

  it(
    'C422215 Add service point when editing shadow user (consortia) (thunderjet)',
    { tags: ['criticalPathECS', 'thunderjet', 'C422215'] },
    () => {
      cy.login(testData.user1.username, testData.user1.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
      ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      UsersSearchPane.searchByUsername(testData.user2.username);
      UsersSearchPane.waitLoading();
      UsersCard.checkAccordionsForShadowUser();
      UsersCard.checkActionsForShadowUser();
      UserEdit.openEdit();
      UserEdit.checkAccordionsForShadowUserInEditMode();
      UserEdit.openServicePointsAccordion();
      UserEdit.addServicePoints(servicePoint.name);
      UserEdit.selectPreferableServicePoint(servicePoint.name);
      UserEdit.saveAndClose();
      UsersCard.openServicePointsAccordion();
      UsersCard.checkServicePoints(servicePoint.name);
    },
  );
});
