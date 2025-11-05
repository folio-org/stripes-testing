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
import ClassificationIdentifierTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ClassificationTypes from '../../../../../support/fragments/settings/inventory/classification-types/classificationTypes';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Classification identifier types', () => {
        let userData;
        const classificationType3 = {
          name: getTestEntityValue('Shared_classification_identifier_type_3'),
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.crudClassificationIdentifierTypes.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudClassificationIdentifierTypes.gui,
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
          ClassificationTypes.getClassificationTypesViaApi({
            limit: 1,
            query: `name=="${classificationType3.name}"`,
          }).then((citResp) => {
            const citId = citResp.classificationTypes[0].id;
            ClassificationIdentifierTypesConsortiumManager.deleteViaApi({
              payload: {
                name: classificationType3.name,
                id: citId,
                source: 'consortium',
              },
              settingId: citId,
              url: '/classification-types',
            });
          });
        });

        it(
          'C410901 User with "Consortium manager: Can share settings to all members" permission is able to add/edit classification identifier type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C410901'] },
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
            ClassificationIdentifierTypesConsortiumManager.choose();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, classificationType3);
            ConsortiaControlledVocabularyPaneset.clickSave();
            let createdCIT = [classificationType3.name, 'consortium', moment().format('l'), 'All'];

            ConfirmShare.waitLoadingConfirmShareToAll(classificationType3.name);
            ConfirmShare.clickConfirm();
            ClassificationIdentifierTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(classificationType3.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT, [
              'edit',
              'trash',
            ]);

            cy.visit(SettingsMenu.classificationTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.classificationTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ClassificationIdentifierTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(
              classificationType3.name,
              actionIcons.edit,
            );

            classificationType3.name = getTestEntityValue('Shared_CIT_3_edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: classificationType3.name,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            createdCIT = [classificationType3.name, 'consortium', moment().format('l'), 'All'];

            ConfirmShare.waitLoadingConfirmShareToAll(classificationType3.name);
            ConfirmShare.clickConfirm();
            ClassificationIdentifierTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.updated(classificationType3.name, 'All'));

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

            cy.visit(SettingsMenu.classificationTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.classificationTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));
          },
        );
      });
    });
  });
});
