import uuid from 'uuid';
import permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import RequestCancellationReasonsConsortiumManager from '../../../../../support/fragments/consortium-manager/circulation/requestCancellationReasonsConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';

const testData = {
  centralSharedReason: {
    payload: {
      name: getTestEntityValue('centralSharedReason_name'),
    },
  },
  centralLocalReason: {
    id: uuid(),
    name: getTestEntityValue('centralLocalReason_name'),
  },
  collegeLocalReason: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalReason_name'),
  },
  universityLocalReason: {
    id: uuid(),
    name: getTestEntityValue('universityLocalReason_name'),
  },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Request cancellation reasons', () => {
      before('create test data', () => {
        cy.getAdminToken();
        RequestCancellationReasonsConsortiumManager.createViaApi(testData.centralSharedReason).then(
          (newReason) => {
            testData.centralSharedReason = newReason;
          },
        );
        cy.addCancellationReasonApi(testData.centralLocalReason);

        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.settingsCircView.gui,
        ]).then((userProperties) => {
          // User for test C410834
          testData.user834 = userProperties;

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, testData.user834.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user834.userId, [
            permissions.settingsCircView.gui,
          ]);
          cy.createTempUser([permissions.settingsCircView.gui])
            .then((user) => {
              // User for test C410837
              testData.user837 = user;
            })
            .then(() => {
              cy.addCancellationReasonApi(testData.collegeLocalReason);
              cy.resetTenant();
              cy.getAdminToken();
              cy.assignPermissionsToExistingUser(testData.user837.userId, [
                permissions.consortiaSettingsConsortiumManagerShare.gui,
                permissions.settingsCircView.gui,
              ]);

              cy.resetTenant();
              cy.getAdminToken();
              cy.assignAffiliationToUser(Affiliations.University, testData.user834.userId);
              cy.assignAffiliationToUser(Affiliations.University, testData.user837.userId);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(testData.user834.userId, [
                permissions.settingsCircView.gui,
              ]);
              cy.assignPermissionsToExistingUser(testData.user837.userId, [
                permissions.settingsCircView.gui,
              ]);
              cy.addCancellationReasonApi(testData.universityLocalReason);
            });
        });
      });

      after('delete test data', () => {
        cy.setTenant(Affiliations.University);
        cy.getUniversityAdminToken();
        cy.deleteCancellationReasonApi(testData.universityLocalReason.id);

        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        cy.getCollegeAdminToken();
        cy.deleteCancellationReasonApi(testData.collegeLocalReason.id);

        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        cy.deleteCancellationReasonApi(testData.centralLocalReason.id);
        RequestCancellationReasonsConsortiumManager.deleteViaApi(testData.centralSharedReason);
        Users.deleteViaApi(testData.user834.userId);
        Users.deleteViaApi(testData.user837.userId);
      });

      it(
        'C410834 User with "Consortium manager: Can view existing settings" permission is able to view the list of request cancellation reasons of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user834.username, testData.user834.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);
          RequestCancellationReasonsConsortiumManager.choose();

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedReason.payload.name,
            '',
            '',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralLocalReason.name, '', '', tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.collegeLocalReason.name, '', '', tenantNames.college],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.universityLocalReason.name, '', '', tenantNames.university],
            ['edit', 'trash'],
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(2);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedReason.payload.name,
            '',
            '',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.centralLocalReason.name,
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.collegeLocalReason.name, '', '', tenantNames.college],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.universityLocalReason.name, '', '', tenantNames.university],
            ['edit', 'trash'],
          );
        },
      );

      it(
        'C410837 User with "Consortium manager: Can share settings to all members" permission is able to view the list of request cancellation reasons of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user837.username, testData.user837.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);
          RequestCancellationReasonsConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralSharedReason.payload.name, '', '', 'All'],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralLocalReason.name, '', '', tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.collegeLocalReason.name, '', '', tenantNames.college],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.universityLocalReason.name, '', '', tenantNames.university],
            ['edit', 'trash'],
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(1);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralSharedReason.payload.name, '', '', 'All'],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.centralLocalReason.name, '', '', tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.collegeLocalReason.name,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalReason.name,
          );
        },
      );
    });
  });
});
