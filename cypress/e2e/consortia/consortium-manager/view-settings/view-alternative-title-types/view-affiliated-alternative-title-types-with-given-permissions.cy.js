import moment from 'moment';
import permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import AlternativeTitleTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../../../support/fragments/topMenu';
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
    describe('View Alternative title types', () => {
      before('create test data', () => {
        cy.getAdminToken();
        AlternativeTitleTypesConsortiumManager.createViaApi(testData.centralSharedType).then(
          (newType) => {
            testData.centralSharedType = newType;
          },
        );
        InventoryInstance.createAlternativeTitleTypeViaAPI(testData.centralLocalType.name).then(
          (alternativeTitleTypeID) => {
            testData.centralLocalType.id = alternativeTitleTypeID;
          },
        );

        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.crudAlternativeTitleTypes.gui,
        ]).then((userProperties) => {
          // User for test C410855
          testData.user855 = userProperties;

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user855.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user855.userId, [
            permissions.crudAlternativeTitleTypes.gui,
          ]);
          cy.createTempUser([permissions.crudAlternativeTitleTypes.gui])
            .then((user) => {
              // User for test C410856
              testData.user856 = user;
            })
            .then(() => {
              cy.createTempUser([permissions.crudAlternativeTitleTypes.gui])
                .then((lastUser) => {
                  // User for test C410858
                  testData.user858 = lastUser;
                })
                .then(() => {
                  InventoryInstance.createAlternativeTitleTypeViaAPI(
                    testData.collegeLocalType.name,
                  ).then((alternativeTitleTypeID) => {
                    testData.collegeLocalType.id = alternativeTitleTypeID;
                  });

                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.assignPermissionsToExistingUser(testData.user856.userId, [
                    permissions.consortiaSettingsConsortiumManagerEdit.gui,
                    permissions.crudAlternativeTitleTypes.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.user858.userId, [
                    permissions.consortiaSettingsConsortiumManagerShare.gui,
                    permissions.crudAlternativeTitleTypes.gui,
                  ]);

                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.assignAffiliationToUser(Affiliations.University, testData.user855.userId);
                  cy.assignAffiliationToUser(Affiliations.University, testData.user856.userId);
                  cy.assignAffiliationToUser(Affiliations.University, testData.user858.userId);
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(testData.user855.userId, [
                    permissions.crudAlternativeTitleTypes.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.user856.userId, [
                    permissions.crudAlternativeTitleTypes.gui,
                  ]);
                  cy.assignPermissionsToExistingUser(testData.user858.userId, [
                    permissions.crudAlternativeTitleTypes.gui,
                  ]);
                  InventoryInstance.createAlternativeTitleTypeViaAPI(
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
        cy.deleteAlternativeTitleTypes(testData.universityLocalType.id);

        cy.setTenant(Affiliations.College);
        cy.deleteAlternativeTitleTypes(testData.collegeLocalType.id);

        cy.resetTenant();
        cy.deleteAlternativeTitleTypes(testData.centralLocalType.id);
        AlternativeTitleTypesConsortiumManager.deleteViaApi(testData.centralSharedType);
        Users.deleteViaApi(testData.user855.userId);
        Users.deleteViaApi(testData.user856.userId);
        Users.deleteViaApi(testData.user858.userId);
      });

      it(
        'C410855 User with "Consortium manager: Can view existing settings" permission is able to view the list of alternative title types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410855'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user855.username, testData.user855.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });
          ConsortiumManagerApp.verifyStatusOfConsortiumManager();
          cy.wait(4000);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          AlternativeTitleTypesConsortiumManager.choose();
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
        'C410856 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of alternative title types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410856'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user856.username, testData.user856.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          ConsortiumManagerApp.waitLoading();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager();
          cy.wait(4000);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          AlternativeTitleTypesConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();
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
        'C410858 User with "Consortium manager: Can share settings to all members" permission is able to view the list of alternative title types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410858'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user858.username, testData.user858.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          ConsortiumManagerApp.waitLoading();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager();
          cy.wait(4000);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          AlternativeTitleTypesConsortiumManager.choose();
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
