import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ModesOfIssuanceConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/modesOfIssuanceConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

const testData = {
  centralSharedModes: {
    payload: {
      name: getTestEntityValue('centralSharedModes_name'),
    },
  },
  centralLocalModes: {
    id: uuid(),
    name: getTestEntityValue('centralLocalModes_name'),
  },
  collegeLocalModes: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalModes_name'),
  },
  universityLocalModes: {
    id: uuid(),
    name: getTestEntityValue('universityLocalModes_name'),
  },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Modes of issuance', () => {
      before('create test data', () => {
        cy.getAdminToken();
        ModesOfIssuanceConsortiumManager.createViaApi(testData.centralSharedModes).then(
          (newModes) => {
            testData.centralSharedModes = newModes;
          },
        );
        InventoryInstance.createModesOfIssuanceViaApi(testData.centralLocalModes.name).then(
          (modesId) => {
            testData.centralLocalModes.id = modesId;
          },
        );

        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
        ]).then((userProperties) => {
          // User for test C410939
          testData.user939 = userProperties;
          cy.wait(20000);

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user939.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user939.userId, [
            permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
          ]);
          cy.createTempUser([permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui]).then(
            (secondUser) => {
              // User for test C410940
              testData.user940 = secondUser;
              cy.createTempUser([permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui]).then(
                (thirdUser) => {
                  // User for test C410942
                  testData.user942 = thirdUser;
                  cy.wait(20000);
                  InventoryInstance.createModesOfIssuanceViaApi(
                    testData.collegeLocalModes.name,
                  ).then((modesId) => {
                    testData.collegeLocalModes.id = modesId;
                  });
                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.assignPermissionsToExistingUser(testData.user940.userId, [
                    permissions.consortiaSettingsConsortiumManagerEdit.gui,
                    permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.user942.userId, [
                    permissions.consortiaSettingsConsortiumManagerShare.gui,
                    permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
                  ]);

                  cy.resetTenant();
                  cy.assignAffiliationToUser(Affiliations.University, testData.user939.userId);
                  cy.assignAffiliationToUser(Affiliations.University, testData.user940.userId);
                  cy.assignAffiliationToUser(Affiliations.University, testData.user942.userId);
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(testData.user939.userId, [
                    permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.user940.userId, [
                    permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.user942.userId, [
                    permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
                  ]);
                  InventoryInstance.createModesOfIssuanceViaApi(
                    testData.universityLocalModes.name,
                  ).then((modesId) => {
                    testData.universityLocalModes.id = modesId;
                  });
                },
              );
            },
          );
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.University);
        cy.deleteModesOfIssuance(testData.universityLocalModes.id);

        cy.setTenant(Affiliations.College);
        cy.deleteModesOfIssuance(testData.collegeLocalModes.id);

        cy.setTenant(Affiliations.Consortia);
        cy.deleteModesOfIssuance(testData.centralLocalModes.id);
        ModesOfIssuanceConsortiumManager.deleteViaApi(testData.centralSharedModes);
        Users.deleteViaApi(testData.user939.userId);
        Users.deleteViaApi(testData.user940.userId);
        Users.deleteViaApi(testData.user942.userId);
      });

      it(
        'C410939 User with "Consortium manager: Can view existing settings" permission is able to view the list of modes of issuance of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user939.username, testData.user939.password);
          // Without waiter, permissions aren't loading
          cy.wait(10000);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          ModesOfIssuanceConsortiumManager.choose();

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedModes.payload.name,
            'consortium',
            '',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralLocalModes.name, 'local', '', tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.collegeLocalModes.name, 'local', '', tenantNames.college],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.universityLocalModes.name, 'local', '', tenantNames.university],
            ['edit', 'trash'],
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(2);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedModes.payload.name,
            'consortium',
            '',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.centralLocalModes.name,
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.collegeLocalModes.name, 'local', '', tenantNames.college],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.universityLocalModes.name, 'local', '', tenantNames.university],
            ['edit', 'trash'],
          );
        },
      );

      it(
        'C410940 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of modes of issuance of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user940.username, testData.user940.password);
          // ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          cy.wait(4000);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          ModesOfIssuanceConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedModes.payload.name,
            'consortium',
            '',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralLocalModes.name, 'local', '', tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.collegeLocalModes.name, 'local', '', tenantNames.college],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalModes.name,
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 2);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(1);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedModes.payload.name,
            'consortium',
            '',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralLocalModes.name, 'local', '', tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.collegeLocalModes.name,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalModes.name,
          );
        },
      );

      it(
        'C410942 User with "Consortium manager: Can share settings to all members" permission is able to view the list of modes of issuance of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user942.username, testData.user942.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          cy.wait(4000);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          ModesOfIssuanceConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralSharedModes.payload.name, 'consortium', '', 'All'],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralLocalModes.name, 'local', '', tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.collegeLocalModes.name, 'local', '', tenantNames.college],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.universityLocalModes.name, 'local', '', tenantNames.university],
            ['edit', 'trash'],
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(1);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralSharedModes.payload.name, 'consortium', '', 'All'],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralLocalModes.name, 'local', '', tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.collegeLocalModes.name,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalModes.name,
          );
        },
      );
    });
  });
});
