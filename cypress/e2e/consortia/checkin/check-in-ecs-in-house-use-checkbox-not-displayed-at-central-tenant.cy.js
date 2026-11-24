import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';

describe('Consortia', () => {
  describe('Check in', () => {
    const testData = {
      user: {},
      centralServicePoint: {},
      collegeServicePoint: {},
    };

    before('Create test data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
        testData.centralServicePoint = sp;
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignCapabilitiesToExistingUser(testData.user.userId, [], [CapabilitySets.uiCheckin]);
      });

      cy.then(() => {
        UserEdit.addServicePointsViaApi(
          [testData.centralServicePoint.id],
          testData.user.userId,
          testData.centralServicePoint.id,
        );
        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
      });

      cy.setTenant(Affiliations.College);

      ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
        testData.collegeServicePoint = servicePoints[0];
      });

      cy.then(() => {
        cy.assignCapabilitiesToExistingUser(testData.user.userId, [], [CapabilitySets.uiCheckin]);
        UserEdit.addServicePointsViaApi(
          [testData.collegeServicePoint.id],
          testData.user.userId,
          testData.collegeServicePoint.id,
        );
      });

      cy.resetTenant();

      cy.then(() => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.checkInPath,
          waiter: CheckInActions.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1602577 [ECS] "In-house use" checkbox is not displayed at Central tenant (consortia) (vega)',
      { tags: ['criticalPathECS', 'vega', 'C1602577'] },
      () => {
        // #1 Navigate to Check In app at Central tenant
        // "In-house use" checkbox is NOT displayed on the "Scanned Items" pane
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        CheckInActions.verifyInHouseUseCheckboxVisible(false);

        // #2 Switch affiliation to Member tenant
        // "In-house use" checkbox is displayed to the right of "Enter" button unchecked by default
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        CheckInActions.verifyInHouseUseCheckboxVisible(true);
        CheckInActions.verifyInHouseUseCheckbox(false);
      },
    );
  });
});
