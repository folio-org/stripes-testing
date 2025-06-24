import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import AlternativeTitleTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Alternative title types', () => {
        let userData;
        const alternativeTitleTypes3 = {
          name: getTestEntityValue('AlternativeTitleTypes3'),
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.crudAlternativeTitleTypes.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudAlternativeTitleTypes.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(userData.username, userData.password);
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          cy.getAlternativeTitlesTypes({
            limit: 1,
            query: `name=="${alternativeTitleTypes3.name}"`,
          }).then((atpResp) => {
            const atpId = atpResp[0].id;
            AlternativeTitleTypesConsortiumManager.deleteViaApi({
              payload: {
                name: alternativeTitleTypes3.name,
                id: atpId,
                source: 'consortium',
              },
              settingId: atpId,
              url: '/alternative-title-types',
            });
          });
        });

        it(
          'C410876 User with "Consortium manager: Can share settings to all members" permission is able to add/edit alternative title type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(1);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, true);

            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            AlternativeTitleTypesConsortiumManager.choose();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, alternativeTitleTypes3);
            ConsortiaControlledVocabularyPaneset.clickSave();
            let rowDataToCheck = [
              alternativeTitleTypes3.name,
              'consortium',
              moment().format('l'),
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(alternativeTitleTypes3.name);
            ConfirmShare.clickConfirm();
            AlternativeTitleTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(alternativeTitleTypes3.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            cy.visit(SettingsMenu.alternativeTitleTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.alternativeTitleTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            AlternativeTitleTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(
              alternativeTitleTypes3.name,
              actionIcons.edit,
            );

            alternativeTitleTypes3.name = getTestEntityValue('AlternativeTitleTypes3Edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: alternativeTitleTypes3.name,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            rowDataToCheck = [
              alternativeTitleTypes3.name,
              'consortium',
              moment().format('l'),
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(alternativeTitleTypes3.name);
            ConfirmShare.clickConfirm();
            AlternativeTitleTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.updated(alternativeTitleTypes3.name, 'All'));

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1);

            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyListIsEmpty();
            // ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();

            cy.visit(SettingsMenu.alternativeTitleTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.alternativeTitleTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck.slice(0, -1));
          },
        );
      });
    });
  });
});
