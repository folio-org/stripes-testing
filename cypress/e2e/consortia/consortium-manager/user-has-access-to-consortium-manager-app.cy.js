import { APPLICATION_NAMES } from '../../../support/constants';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import ConsortiumManager, {
  settingsItems,
} from '../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import Arrays from '../../../support/utils/arrays';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    let userData;
    const settingsList = Object.values(settingsItems);
    const verifyFoundMembersAndTotalSelected = (members, total) => {
      SelectMembers.verifyMembersFound(members);
      SelectMembers.verifyTotalSelected(total);
      SelectMembers.verifyAvailableTenants([tenantNames.central]);
    };

    before('Create users data', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.consortiaSettingsConsortiumManagerEdit.gui])
        .then((userProperties) => {
          userData = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(userData.userId);
          cy.resetTenant();
          cy.login(userData.username, userData.password);
        });
    });

    after('Delete users data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C397336 User with "Consortium manager: Can create, edit and remove settings" permission and active affiliations in "Central" and "Member" tenants has access to "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C397336'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager();
        ConsortiumManager.clickSelectMembers();
        SelectMembers.verifyStatusOfSelectMembersModal();

        SelectMembers.changeSelectAllCheckbox('check');
        verifyFoundMembersAndTotalSelected(2, 2, [tenantNames.central, tenantNames.college]);
        SelectMembers.searchTenant(tenantNames.central);
        verifyFoundMembersAndTotalSelected(1, 2, [tenantNames.central]);

        SelectMembers.selectMembers(tenantNames.central);
        SelectMembers.verifyMembersFound(1);
        SelectMembers.verifyTotalSelected(1);
        SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

        SelectMembers.saveAndClose();
        ConsortiumManager.verifyStatusOfConsortiumManager(1);

        const randomSetting = Arrays.getRandomElement(settingsList);
        ConsortiumManager.chooseSettingsItem(randomSetting);
        ConsortiumManager.verifyMembersSelected(1);
        ConsortiumManager.verifySelectMembersButton();

        ConsortiumManager.clickSelectMembers();
        verifyFoundMembersAndTotalSelected(2, 1, [tenantNames.central, tenantNames.college]);
        SelectMembers.verifyMemberIsSelected(tenantNames.central, false);
        SelectMembers.verifyMemberIsSelected(tenantNames.college, true);
        SelectMembers.verifyModalCloseButtonEnabled();
        SelectMembers.verifyModalCancelButtonEnabled();
        SelectMembers.verifyModalSaveButtonEnabled();

        SelectMembers.selectMembers(tenantNames.central);
        SelectMembers.selectMembers(tenantNames.college);
        verifyFoundMembersAndTotalSelected(2, 1, [tenantNames.central, tenantNames.college]);
        SelectMembers.verifyMemberIsSelected(tenantNames.central, true);
        SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
        SelectMembers.verifyModalCloseButtonEnabled();
        SelectMembers.verifyModalCancelButtonEnabled();
        SelectMembers.verifyModalSaveButtonEnabled();

        SelectMembers.saveAndClose();
        ConsortiumManager.waitLoading();
        ConsortiumManager.verifySettingPaneIsDisplayed();
        ConsortiumManager.verifyPaneIncludesSettings();
        ConsortiumManager.verifyMembersSelected(1);
        ConsortiumManager.verifySelectMembersButton();

        cy.logout();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager(1);
        ConsortiumManager.clickSelectMembers();
        SelectMembers.verifyStatusOfSelectMembersModal(2, 1);
        SelectMembers.verifyMemberIsSelected(tenantNames.central, true);
      },
    );
  });
});
