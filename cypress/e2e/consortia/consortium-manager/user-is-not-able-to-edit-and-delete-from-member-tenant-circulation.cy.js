import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import RequestCancellationReasonsConsortiumManager from '../../../support/fragments/consortium-manager/circulation/requestCancellationReasonsConsortiumManager';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
// import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';

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
        'C400666 User is NOT able to edit and delete from member tenant "Circulation" settings shared via "Consortium manager" app (consortia) (thunderjet)',
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

          RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
            name: testData.centralSharedReason.payload.name,
            members: 'All',
          });
          RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
            name: testData.centralLocalReason.name,
            members: tenantNames.central,
            actions: ['edit', 'trash'],
          });

          RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
            name: testData.collegeLocalReason.name,
            members: tenantNames.college,
            actions: ['edit', 'trash'],
          });
          RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
            name: testData.universityLocalReason.name,
            members: tenantNames.university,
            actions: ['edit', 'trash'],
          });

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(2);
          RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
            name: testData.centralSharedReason.payload.name,
            description: '',
            publicDescription: '',
            members: 'All',
          });
          RequestCancellationReasonsConsortiumManager.verifyNoReasonInTheList(
            testData.centralLocalReason.name,
          );

          RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
            name: testData.collegeLocalReason.name,
            description: '',
            publicDescription: '',
            members: tenantNames.college,
            actions: ['edit', 'trash'],
          });
          RequestCancellationReasonsConsortiumManager.verifyReasonInTheList({
            name: testData.universityLocalReason.name,
            description: '',
            publicDescription: '',
            members: tenantNames.university,
            actions: ['edit', 'trash'],
          });
        },
      );
    });
  });
});
