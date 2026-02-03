import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import HoldingsNoteTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import HoldingsTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/holdings/holdingsTypesConsortiumManager';
import HoldingsTypes from '../../../support/fragments/settings/inventory/holdings/holdingsTypes';
import HoldingsNoteTypes from '../../../support/fragments/settings/inventory/holdings/holdingsNoteTypes';

const testData = {
  centralSharedHoldingsNoteTypes: {
    payload: {
      name: getTestEntityValue('centralSharedHoldingsNoteTypes_name'),
    },
  },
  centralSharedHoldingsTypes: {
    payload: {
      name: getTestEntityValue('centralSharedHoldingsTypes_name'),
    },
  },
  collegeLocalHoldingsNoteType: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalHoldingsNoteTypes_name'),
    source: 'local',
  },
  universityLocalHoldingsTypes: {
    id: uuid(),
    name: getTestEntityValue('universityLocalHoldingsTypes_name'),
    source: 'local',
  },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Inventory', () => {
      before('create test data', () => {
        cy.getAdminToken();
        HoldingsNoteTypesConsortiumManager.createViaApi(
          testData.centralSharedHoldingsNoteTypes,
        ).then((newHoldingsNoteType) => {
          testData.centralSharedHoldingsNoteTypes = newHoldingsNoteType;
        });
        HoldingsTypesConsortiumManager.createViaApi(testData.centralSharedHoldingsTypes).then(
          (newHoldingsTypes) => {
            testData.centralSharedHoldingsTypes = newHoldingsTypes;
          },
        );
        cy.createTempUser([]).then((userProperties) => {
          // User for test C401723
          testData.user401723 = userProperties;

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, testData.user401723.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user401723.userId, [
            permissions.inventoryCRUDHoldingsNoteTypes.gui,
          ]);
          HoldingsNoteTypes.createViaApi(testData.collegeLocalHoldingsNoteType);
          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, testData.user401723.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user401723.userId, [
            permissions.inventoryCRUDHoldingsTypes.gui,
          ]);
          HoldingsTypes.createViaApi(testData.universityLocalHoldingsTypes);
          cy.resetTenant();
          cy.login(testData.user401723.username, testData.user401723.password);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        HoldingsNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedHoldingsNoteTypes);
        HoldingsTypesConsortiumManager.deleteViaApi(testData.centralSharedHoldingsTypes);
        Users.deleteViaApi(testData.user401723.userId);
      });

      it(
        'C401723 User is NOT able to edit and delete from member tenant "Inventory - Holdings" settings shared via "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C401723'] },
        () => {
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.holdingsNoteTypesPath);
          HoldingsNoteTypes.verifyConsortiumHoldingsNoteTypesInTheList({
            name: testData.centralSharedHoldingsNoteTypes.payload.name,
            source: 'consortium',
          });

          HoldingsNoteTypes.verifyLocalHoldingsNoteTypesInTheList({
            name: testData.collegeLocalHoldingsNoteType.name,
            actions: ['edit', 'trash'],
          });

          HoldingsNoteTypes.clickTrashButtonForHoldingsNoteTypes(
            testData.collegeLocalHoldingsNoteType.name,
          );

          HoldingsNoteTypes.verifyHoldingsNoteTypesAbsentInTheList({
            name: testData.collegeLocalHoldingsNoteType.name,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.holdingsTypes);
          HoldingsTypes.verifyConsortiumHoldingsTypeInTheList({
            name: testData.centralSharedHoldingsTypes.payload.name,
            source: 'consortium',
          });

          HoldingsTypes.verifyLocalHoldingsTypeInTheList({
            name: testData.universityLocalHoldingsTypes.name,
            actions: ['edit', 'trash'],
          });

          HoldingsTypes.clickTrashButtonForHoldingsType(testData.universityLocalHoldingsTypes.name);

          HoldingsTypes.verifyHoldingsTypesAbsentInTheList({
            name: testData.universityLocalHoldingsTypes.name,
          });
        },
      );
    });
  });
});
