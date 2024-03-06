import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import StatisticalCodeTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodeTypesConsortiumManager';
// import URLRelationshipConsortiumManager from '../../../support/fragments/consortium-manager/inventory/instances-holdings-items/urlRelationshipConsortiumManager';
import StatisticalCodeTypes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodeTypes';
import URLRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';

// Commented position not working as expect
const testData = {
  centralSharedStatisticalCodeTypes: {
    payload: {
      name: getTestEntityValue('centralStatisticalCodeTypes_name'),
    },
  },
  centralSharedURLRelationship: {
    payload: {
      name: getTestEntityValue('centralSharedURLRelationship_name'),
    },
  },
  collegeLocalStatisticalCodeTypes: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalStatisticalCodeTypes_name'),
    source: 'local',
  },
  //   universityLocalURLRelationship: {
  //     id: uuid(),
  //     name: getTestEntityValue('universityLocalURLRelationship_name'),
  //     source: 'local',
  //   },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Inventory', () => {
      before('create test data', () => {
        cy.getAdminToken();
        StatisticalCodeTypesConsortiumManager.createViaApi(
          testData.centralSharedStatisticalCodeTypes,
        ).then((newdStatisticalCodeTypes) => {
          testData.centralSharedStatisticalCodeTypes = newdStatisticalCodeTypes;
        });
        // URLRelationshipConsortiumManager.createViaApi(testData.centralSharedURLRelationship).then(
        //   (newURLRelationship) => {
        //     testData.centralSharedURLRelationship = newURLRelationship;
        //   },
        // );
        cy.createTempUser([]).then((userProperties) => {
          // User for test C401726
          testData.user401726 = userProperties;

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, testData.user401726.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user401726.userId, [
            permissions.uiCreateEditDeletestatisticalCodeTypes.gui,
            permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
          ]);
          StatisticalCodeTypes.createViaApi(testData.collegeLocalStatisticalCodeTypes);
          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, testData.user401726.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user401726.userId, [
            permissions.uiCreateEditDeleteURL.gui,
          ]);
          URLRelationship.createViaApi(testData.universityLocalURLRelationship);
          cy.resetTenant();
          cy.login(testData.user401726.username, testData.user401726.password);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        StatisticalCodeTypesConsortiumManager.deleteViaApi(
          testData.centralSharedStatisticalCodeTypes,
        );
        // URLRelationshipConsortiumManager.deleteViaApi(testData.centralSharedURLRelationship);
        Users.deleteViaApi(testData.user401726.userId);
      });

      it(
        'C401726 User is NOT able to edit and delete from member tenant "Inventory - Instances, Holdings, Items" settings shared via "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.statisticalCodeTypesPath);
          StatisticalCodeTypes.verifyStatisticalCodeTypesInTheList({
            name: testData.centralSharedStatisticalCodeTypes.payload.name,
            source: 'consortium',
          });

          StatisticalCodeTypes.verifyStatisticalCodeTypesInTheList({
            name: testData.collegeLocalStatisticalCodeTypes.name,
            source: 'local',
            actions: ['edit', 'trash'],
          });

          StatisticalCodeTypes.clickTrashButtonForStatisticalCodeTypes(
            testData.collegeLocalStatisticalCodeTypes.name,
          );

          StatisticalCodeTypes.verifyStatisticalCodeTypesAbsentInTheList({
            name: testData.collegeLocalStatisticalCodeTypes.name,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.urlRelationshipPath);
          //   URLRelationship.verifyUrlRelationshipInTheList({
          //     name: testData.centralSharedURLRelationship.payload.name,
          //     source: 'consortium',
          //   });

          URLRelationship.verifyUrlRelationshipInTheList({
            name: testData.universityLocalURLRelationship.name,
            source: 'local',
            actions: ['edit', 'trash'],
          });

          URLRelationship.deleteUrlRelationship(testData.universityLocalURLRelationship.name);

          URLRelationship.verifyUrlRelationshipAbsentInTheList({
            name: testData.universityLocalURLRelationship.name,
          });
        },
      );
    });
  });
});
