import moment from 'moment';
import permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../../support/fragments/topMenu';
import ClassificationIdentifierTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
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
    describe('View Classification identifier types', () => {
      before('create test data', () => {
        cy.getAdminToken();
        ClassificationIdentifierTypesConsortiumManager.createViaApi(
          testData.centralSharedType,
        ).then((newType) => {
          testData.centralSharedType = newType;
        });
        InventoryInstance.createClassificationTypeViaApi(testData.centralLocalType.name).then(
          (alternativeTitleTypeID) => {
            testData.centralLocalType.id = alternativeTitleTypeID;
          },
        );

        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            permissions.crudClassificationIdentifierTypes.gui,
          ]).then(() => {
            InventoryInstance.createClassificationTypeViaApi(testData.collegeLocalType.name).then(
              (alternativeTitleTypeID) => {
                testData.collegeLocalType.id = alternativeTitleTypeID;
              },
            );

            cy.resetTenant();
            cy.getAdminToken();
            cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              permissions.crudClassificationIdentifierTypes.gui,
            ]);
            InventoryInstance.createClassificationTypeViaApi(
              testData.universityLocalType.name,
            ).then((alternativeTitleTypeID) => {
              testData.universityLocalType.id = alternativeTitleTypeID;
            });
          });
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });
        });
      });

      after('delete test data', () => {
        cy.setTenant(Affiliations.University);
        cy.getUniversityAdminToken();
        cy.deleteClassifierIdentifierTypes(testData.universityLocalType.id);

        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        cy.getCollegeAdminToken();
        cy.deleteClassifierIdentifierTypes(testData.collegeLocalType.id);

        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        cy.deleteClassifierIdentifierTypes(testData.centralLocalType.id);
        ClassificationIdentifierTypesConsortiumManager.deleteViaApi(testData.centralSharedType);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C410885 User with "Consortium manager: Can view existing settings" permission is able to view the list of classification identifier types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          ClassificationIdentifierTypesConsortiumManager.choose();
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
    });
  });
});
