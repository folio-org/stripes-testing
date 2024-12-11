import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import RequestCancellationReasonsConsortiumManager from '../../../support/fragments/consortium-manager/circulation/requestCancellationReasonsConsortiumManager';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import CancellationReason from '../../../support/fragments/settings/circulation/cancellationReason';
import ConsortiaControlledVocabularyPaneset from '../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';

const testData = {
  centralSharedReason: {
    payload: {
      name: getTestEntityValue('centralSharedReason_name'),
    },
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

        cy.createTempUser([]).then((userProperties) => {
          // User for test C400666
          testData.user400666 = userProperties;

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, testData.user400666.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user400666.userId, [
            permissions.settingsCircView.gui,
          ]);
          cy.addCancellationReasonViaApi(testData.collegeLocalReason);
          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, testData.user400666.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user400666.userId, [
            permissions.settingsCircView.gui,
          ]);
          cy.addCancellationReasonViaApi(testData.universityLocalReason);
          cy.loginAsAdmin({
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(12);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.circulation);
          RequestCancellationReasonsConsortiumManager.choose();

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedReason.payload.name,
            '',
            '',
            'All',
          ]);

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.collegeLocalReason.name,
            '',
            '',
            tenantNames.college,
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.universityLocalReason.name,
            '',
            '',
            tenantNames.university,
          ]);
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
        RequestCancellationReasonsConsortiumManager.deleteViaApi(testData.centralSharedReason);
        Users.deleteViaApi(testData.user400666.userId);
      });

      it(
        'C400666 User is NOT able to edit and delete from member tenant "Circulation" settings shared via "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user400666.username, testData.user400666.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);

          CancellationReason.verifyReasonInTheList({
            name: testData.centralSharedReason.payload.name,
          });

          CancellationReason.verifyReasonInTheList({
            name: testData.collegeLocalReason.name,
            actions: ['edit', 'trash'],
          });

          CancellationReason.clickTrashButtonForReason({
            name: testData.collegeLocalReason.name,
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);

          CancellationReason.verifyReasonInTheList({
            name: testData.universityLocalReason.name,
            actions: ['edit', 'trash'],
          });

          CancellationReason.verifyReasonInTheList({
            name: testData.universityLocalReason.name,
          });
          CancellationReason.verifyReasonInTheList({
            name: testData.centralSharedReason.payload.name,
          });
          CancellationReason.verifyReasonAbsentInTheList({
            name: testData.collegeLocalReason.name,
          });
        },
      );
    });
  });
});
