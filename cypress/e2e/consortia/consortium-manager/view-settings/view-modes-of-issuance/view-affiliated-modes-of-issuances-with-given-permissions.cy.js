import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ModesOfIssuanceConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/modesOfIssuanceConsortiumManager';

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
          testData.user = userProperties;

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
          ]);
          InventoryInstance.createModesOfIssuanceViaApi(testData.collegeLocalModes.name).then(
            (modesId) => {
              testData.collegeLocalModes.id = modesId;
            },
          );

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            permissions.uiSettingsModesOfIssuanceCreateEditDelete.gui,
          ]);
          InventoryInstance.createModesOfIssuanceViaApi(testData.universityLocalModes.name).then(
            (modesId) => {
              testData.universityLocalModes.id = modesId;
            },
          );
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });
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
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C410939 User with "Consortium manager: Can view existing settings" permission is able to view the list of modes of issuance of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          ModesOfIssuanceConsortiumManager.choose();

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedModes.payload.name,
            'consortium',
            `${moment().format('l')} by SystemConsortia`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalModes.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.central,
            ],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalModes.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.college,
            ],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalModes.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.university,
            ],
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
            `${moment().format('l')} by SystemConsortia`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.centralLocalModes.name,
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalModes.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.college,
            ],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalModes.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.university,
            ],
            ['edit', 'trash'],
          );
        },
      );
    });
  });
});
