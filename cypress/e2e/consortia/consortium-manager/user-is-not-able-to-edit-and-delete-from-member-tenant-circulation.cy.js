import uuid from 'uuid';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import permissions from '../../../support/dictionary/permissions';
import RequestCancellationReasonsConsortiumManager from '../../../support/fragments/consortium-manager/circulation/requestCancellationReasonsConsortiumManager';
import ConsortiaControlledVocabularyPaneset from '../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import CancellationReason from '../../../support/fragments/settings/circulation/cancellationReason';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { getTestEntityValue } from '../../../support/utils/stringTools';

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
          cy.addCancellationReasonApi(testData.collegeLocalReason);
          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, testData.user400666.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user400666.userId, [
            permissions.settingsCircView.gui,
          ]);
          cy.addCancellationReasonApi(testData.universityLocalReason);
          cy.resetTenant();
          cy.wait(10000);
          cy.loginAsAdmin({
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });
          cy.reload();
          cy.wait(5000);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager();
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
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        cy.deleteCancellationReasonApi(testData.collegeLocalReason.id);

        cy.setTenant(Affiliations.University);
        cy.deleteCancellationReasonApi(testData.universityLocalReason.id);

        cy.resetTenant();
        RequestCancellationReasonsConsortiumManager.deleteViaApi(testData.centralSharedReason);
        Users.deleteViaApi(testData.user400666.userId);
      });

      it(
        'C400666 User is NOT able to edit and delete from member tenant "Circulation" settings shared via "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C400666'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user400666.username, testData.user400666.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
          cy.wait(4000);

          CancellationReason.verifyReasonInTheList({
            name: testData.centralSharedReason.payload.name,
          });

          CancellationReason.verifyReasonInTheList({
            name: testData.collegeLocalReason.name,
            actions: ['edit', 'trash'],
          });

          CancellationReason.verifyReasonIsNotInTheList({
            name: testData.universityLocalReason.name,
          });

          CancellationReason.clickEditButtonForReason(testData.collegeLocalReason.name);
          testData.collegeLocalReason.name += '_edited';
          testData.collegeLocalReason.description = 'edited description';
          testData.collegeLocalReason.publicDescription = 'edited public description';
          CancellationReason.fillCancellationReason(testData.collegeLocalReason);
          CancellationReason.saveCancellationReason();
          InteractorsTools.checkCalloutMessage(
            `The  ${testData.collegeLocalReason.name} was successfully updated`,
          );
          CancellationReason.verifyReasonInTheList(testData.collegeLocalReason);

          CancellationReason.clickTrashButtonForReason(testData.collegeLocalReason.name);
          CancellationReason.clickTrashButtonConfirm();
          InteractorsTools.checkCalloutMessage(
            `The cancel reason ${testData.collegeLocalReason.name} was successfully deleted`,
          );

          CancellationReason.verifyReasonIsNotInTheList({
            name: testData.collegeLocalReason.name,
          });

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.circulationRequestCancellationReasonsPath);
          cy.wait(4000);

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
          CancellationReason.verifyReasonIsNotInTheList({
            name: testData.collegeLocalReason.name,
          });
        },
      );
    });
  });
});
