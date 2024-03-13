import moment from 'moment';
import permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InstanceNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/instanceNoteTypesConsortiumManager';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';

const testData = {
  centralSharedType: {
    payload: {
      name: getTestEntityValue('centralSharedType_name'),
    },
  },
  centralLocalType: {
    name: getTestEntityValue('centralLocalType_name'),
  },
  collegeLocalType: {
    name: getTestEntityValue('collegeLocalType_name'),
  },
  universityLocalType: {
    name: getTestEntityValue('universityLocalType_name'),
  },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Instance note types', () => {
      before('create test data', () => {
        cy.getAdminToken();
        InstanceNoteTypesConsortiumManager.createViaApi(testData.centralSharedType).then(
          (newType) => {
            testData.centralSharedType = newType;
          },
        );
        InventoryInstance.createInstanceNoteTypeViaApi(testData.centralLocalType.name).then(
          (noteTypeId) => {
            testData.centralLocalType.id = noteTypeId;
          },
        );

        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.crudInstanceNoteTypes.gui,
        ]).then((userProperties) => {
          // User for test C410909
          testData.user909 = userProperties;
          cy.wait(15000);

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user909.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user909.userId, [
            permissions.crudInstanceNoteTypes.gui,
          ]);
          cy.createTempUser([permissions.crudInstanceNoteTypes.gui]).then((secondUser) => {
            // User for test C410910
            testData.user910 = secondUser;
            InventoryInstance.createInstanceNoteTypeViaApi(testData.collegeLocalType.name).then(
              (noteTypeId) => {
                testData.collegeLocalType.id = noteTypeId;
              },
            );
            cy.resetTenant();
            cy.getAdminToken();
            cy.assignPermissionsToExistingUser(testData.user910.userId, [
              permissions.consortiaSettingsConsortiumManagerEdit.gui,
              permissions.crudInstanceNoteTypes.gui,
            ]);

            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, testData.user909.userId);
            cy.assignAffiliationToUser(Affiliations.University, testData.user910.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(testData.user909.userId, [
              permissions.crudInstanceNoteTypes.gui,
            ]);
            cy.assignPermissionsToExistingUser(testData.user910.userId, [
              permissions.crudInstanceNoteTypes.gui,
            ]);
            InventoryInstance.createInstanceNoteTypeViaApi(testData.universityLocalType.name).then(
              (noteTypeId) => {
                testData.universityLocalType.id = noteTypeId;
              },
            );
          });
        });
      });

      after('delete test data', () => {
        cy.setTenant(Affiliations.University);
        cy.getUniversityAdminToken();
        cy.deleteInstanceNoteTypes(testData.universityLocalType.id);

        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        cy.getCollegeAdminToken();
        cy.deleteInstanceNoteTypes(testData.collegeLocalType.id);

        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        cy.deleteInstanceNoteTypes(testData.centralLocalType.id);
        InstanceNoteTypesConsortiumManager.deleteViaApi(testData.centralSharedType);
        Users.deleteViaApi(testData.user909.userId);
        Users.deleteViaApi(testData.user910.userId);
      });

      it(
        'C410909 User with "Consortium manager: Can view existing settings" permission is able to view the list of instance note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user909.username, testData.user909.password);
          // Without waiter, permissions aren't loading
          cy.wait(10000);
          TopMenuNavigation.navigateToApp('Consortium manager');
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          InstanceNoteTypesConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedType.payload.name,
            'consortium',
            `${moment().format('l')} by SystemConsortia`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalType.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.central,
            ],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalType.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.college,
            ],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalType.name,
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
            testData.centralSharedType.payload.name,
            'consortium',
            `${moment().format('l')} by SystemConsortia`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.centralLocalType.name,
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalType.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.college,
            ],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalType.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.university,
            ],
            ['edit', 'trash'],
          );
        },
      );

      it(
        'C410910 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of instance note types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user910.username, testData.user910.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          TopMenuNavigation.navigateToApp('Consortium manager');
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          InstanceNoteTypesConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedType.payload.name,
            'consortium',
            `${moment().format('l')} by SystemConsortia`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalType.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.central,
            ],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalType.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.college,
            ],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalType.name,
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 2);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(1);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedType.payload.name,
            'consortium',
            `${moment().format('l')} by SystemConsortia`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalType.name,
              'local',
              `${moment().format('l')} by Admin, ECS`,
              tenantNames.central,
            ],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.collegeLocalType.name,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalType.name,
          );
        },
      );
    });
  });
});
