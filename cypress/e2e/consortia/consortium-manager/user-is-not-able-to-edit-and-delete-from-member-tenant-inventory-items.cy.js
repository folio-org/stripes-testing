import uuid from 'uuid';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import permissions from '../../../support/dictionary/permissions';
import ItemNoteTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import LoanTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/items/loanTypesConsortiumManager';
import MaterialTypesConsortiumManager from '../../../support/fragments/consortium-manager/inventory/items/materialTypesConsortiumManager';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import ItemNoteTypes from '../../../support/fragments/settings/inventory/items/itemNoteTypes';
import LoanTypes from '../../../support/fragments/settings/inventory/items/loanTypes';
import MaterialTypes from '../../../support/fragments/settings/inventory/items/materialTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

const testData = {
  centralSharedItemNoteTypes: {
    payload: {
      name: getTestEntityValue('centralSharedItemNoteTypes_name'),
    },
  },
  centralSharedLoanTypes: {
    payload: {
      name: getTestEntityValue('centralSharedLoanTypes_name'),
    },
  },
  centralSharedMaterialTypes: {
    payload: {
      name: getTestEntityValue('centralSharedMaterialTypes_name'),
    },
  },
  collegeLocalItemNoteTypes: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalItemNoteTypes_name'),
    source: 'local',
  },
  collegeLocalLoanTypes: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalLoanTypes_name'),
  },
  universityMaterialTypes: {
    id: uuid(),
    name: getTestEntityValue('universityMaterialTypes_name'),
    source: 'local',
  },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Inventory', () => {
      before('create test data', () => {
        cy.getAdminToken();
        ItemNoteTypesConsortiumManager.createViaApi(testData.centralSharedItemNoteTypes).then(
          (newItemNoteType) => {
            testData.centralSharedItemNoteTypes = newItemNoteType;
          },
        );
        LoanTypesConsortiumManager.createViaApi(testData.centralSharedLoanTypes).then(
          (newLoanTypes) => {
            testData.centralSharedLoanTypes = newLoanTypes;
          },
        );
        MaterialTypesConsortiumManager.createViaApi(testData.centralSharedMaterialTypes).then(
          (newMaterialType) => {
            testData.centralSharedMaterialTypes = newMaterialType;
          },
        );
        cy.createTempUser([]).then((userProperties) => {
          // User for test C401725
          testData.user401725 = userProperties;

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, testData.user401725.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user401725.userId, [
            permissions.inventoryCRUDItemNoteTypes.gui,
            permissions.uiCreateEditDeleteLoanTypes.gui,
          ]);
          ItemNoteTypes.createItemNoteTypeViaApi(testData.collegeLocalItemNoteTypes);
          LoanTypes.createLoanTypesViaApi(testData.collegeLocalLoanTypes);
          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, testData.user401725.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user401725.userId, [
            permissions.uiCreateEditDeleteMaterialTypes.gui,
          ]);
          MaterialTypes.createMaterialTypesViaApi(testData.universityMaterialTypes);
          cy.resetTenant();
          cy.login(testData.user401725.username, testData.user401725.password);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ItemNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedItemNoteTypes);
        LoanTypesConsortiumManager.deleteViaApi(testData.centralSharedLoanTypes);
        MaterialTypesConsortiumManager.deleteViaApi(testData.centralSharedMaterialTypes);
        Users.deleteViaApi(testData.user401725.userId);
      });

      it(
        'C401725 ser is NOT able to edit and delete from member tenant "Inventory - Items" settings shared via "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C401725'] },
        () => {
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.itemNoteTypesPath);
          ItemNoteTypes.verifyConsortiumItemNoteTypesInTheList({
            name: testData.centralSharedItemNoteTypes.payload.name,
          });

          ItemNoteTypes.verifyLocalItemNoteTypesInTheList({
            name: testData.collegeLocalItemNoteTypes.name,
            actions: ['edit', 'trash'],
          });

          ItemNoteTypes.clickTrashButtonForItemNoteTypes(testData.collegeLocalItemNoteTypes.name);

          ItemNoteTypes.verifyItemNoteTypesAbsentInTheList({
            name: testData.collegeLocalItemNoteTypes.name,
          });
          cy.visit(SettingsMenu.loanTypesPath);
          LoanTypes.verifyLoanTypesInTheList({
            name: testData.centralSharedLoanTypes.payload.name,
          });

          LoanTypes.verifyLoanTypesInTheList({
            name: testData.collegeLocalLoanTypes.name,
            actions: ['edit', 'trash'],
          });

          LoanTypes.clickTrashButtonForLoanTypes(testData.collegeLocalLoanTypes.name);

          LoanTypes.verifyLoanTypesAbsentInTheList({
            name: testData.collegeLocalLoanTypes.name,
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.materialTypePath);
          MaterialTypes.verifyConsortiumMaterialTypesInTheList({
            name: testData.centralSharedMaterialTypes.payload.name,
          });

          MaterialTypes.verifyLocalMaterialTypesInTheList({
            name: testData.universityMaterialTypes.name,
            actions: ['edit', 'trash'],
          });

          MaterialTypes.clickTrashButtonForMaterialTypes(testData.universityMaterialTypes.name);

          MaterialTypes.verifyMaterialTypesAbsentInTheList({
            name: testData.universityMaterialTypes.name,
          });
        },
      );
    });
  });
});
