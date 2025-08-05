import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ClassificationIdentifierTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

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
          // User for test C410885
          testData.user885 = userProperties;

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user885.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user885.userId, [
            permissions.crudClassificationIdentifierTypes.gui,
          ]);
          cy.createTempUser([permissions.crudClassificationIdentifierTypes.gui])
            .then((user) => {
              // User for test C410886
              testData.user886 = user;
            })
            .then(() => {
              cy.createTempUser([permissions.crudClassificationIdentifierTypes.gui])
                .then((lastUser) => {
                  // User for test C410888
                  testData.user888 = lastUser;
                })
                .then(() => {
                  InventoryInstance.createClassificationTypeViaApi(
                    testData.collegeLocalType.name,
                  ).then((alternativeTitleTypeID) => {
                    testData.collegeLocalType.id = alternativeTitleTypeID;
                  });

                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.assignPermissionsToExistingUser(testData.user886.userId, [
                    permissions.consortiaSettingsConsortiumManagerEdit.gui,
                    permissions.crudClassificationIdentifierTypes.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.user888.userId, [
                    permissions.consortiaSettingsConsortiumManagerShare.gui,
                    permissions.crudClassificationIdentifierTypes.gui,
                  ]);

                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.assignAffiliationToUser(Affiliations.University, testData.user885.userId);
                  cy.assignAffiliationToUser(Affiliations.University, testData.user886.userId);
                  cy.assignAffiliationToUser(Affiliations.University, testData.user888.userId);
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(testData.user885.userId, [
                    permissions.crudClassificationIdentifierTypes.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.user886.userId, [
                    permissions.crudClassificationIdentifierTypes.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.user888.userId, [
                    permissions.crudClassificationIdentifierTypes.gui,
                  ]);
                  InventoryInstance.createClassificationTypeViaApi(
                    testData.universityLocalType.name,
                  ).then((alternativeTitleTypeID) => {
                    testData.universityLocalType.id = alternativeTitleTypeID;
                  });
                });
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.University);
        cy.deleteClassifierIdentifierTypes(testData.universityLocalType.id);

        cy.setTenant(Affiliations.College);
        cy.deleteClassifierIdentifierTypes(testData.collegeLocalType.id);

        cy.resetTenant();
        cy.deleteClassifierIdentifierTypes(testData.centralLocalType.id);
        ClassificationIdentifierTypesConsortiumManager.deleteViaApi(testData.centralSharedType);
        Users.deleteViaApi(testData.user885.userId);
        Users.deleteViaApi(testData.user886.userId);
        Users.deleteViaApi(testData.user888.userId);
      });

      it(
        'C410885 User with "Consortium manager: Can view existing settings" permission is able to view the list of classification identifier types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410885'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user885.username, testData.user885.password);
          // Without waiter, permissions aren't loading
          cy.wait(10000);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.waitLoading();
          cy.wait(4000);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          ClassificationIdentifierTypesConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedType.payload.name,
            'consortium',
            `${moment().format('l')} by`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
            [],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.college,
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.university,
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(2);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedType.payload.name,
            'consortium',
            `${moment().format('l')} by`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.centralLocalType.name,
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.college,
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.university,
            ],
            [],
          );
        },
      );

      it(
        'C410886 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of classification identifier types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410886'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user886.username, testData.user886.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
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
          ClassificationIdentifierTypesConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedType.payload.name,
            'consortium',
            `${moment().format('l')} by`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalType.name,
              'local',
              `${moment().format('l')} by`,
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
            `${moment().format('l')} by`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalType.name,
              'local',
              `${moment().format('l')} by`,
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

      it(
        'C410888 User with "Consortium manager: Can share settings to all members" permission is able to view the list of classification identifier types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410888'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user888.username, testData.user888.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          cy.wait(4000);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          ClassificationIdentifierTypesConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralSharedType.payload.name,
              'consortium',
              `${moment().format('l')} by`,
              'All',
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
            [],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.college,
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.university,
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(1);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralSharedType.payload.name,
              'consortium',
              `${moment().format('l')} by`,
              'All',
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalType.name,
              'local',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
            [],
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
