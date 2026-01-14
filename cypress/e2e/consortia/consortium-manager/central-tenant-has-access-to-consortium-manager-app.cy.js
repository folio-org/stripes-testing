import { APPLICATION_NAMES } from '../../../support/constants';
import { tenantNames } from '../../../support/dictionary/affiliations';
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

    const chooseSettingItem = (setting) => {
      ConsortiumManager.chooseSettingsItem(setting);
      ConsortiumManager.verifySelectMembersButton();
    };
    const verifyFoundMembersAndTotalSelected = (members, total) => {
      SelectMembers.verifyMembersFound(members);
      SelectMembers.verifyTotalSelected(total);
      SelectMembers.verifyAvailableTenants([tenantNames.central]);
    };
    const checkConsortiumManagerAfterSelectMembersSave = (setting, members) => {
      SelectMembers.saveAndClose();
      ConsortiumManager.waitLoading();
      ConsortiumManager.verifySettingPaneIsDisplayed();
      ConsortiumManager.verifySelectedSettingIsDisplayed(setting);
      ConsortiumManager.verifyMembersSelected(members);
      ConsortiumManager.verifySelectMembersButton();
    };

    before('Create users data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.consortiaSettingsConsortiumManagerView.gui]).then(
        (userProperties) => {
          userData = userProperties;
          cy.login(userData.username, userData.password);
        },
      );
    });

    after('Delete users data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C397333 User with "Consortium manager: Can view existing settings" permission and active affiliation in "Central" tenant has access to "Consortium manager" app (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'C397333'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager();
        ConsortiumManager.verifyMembersSelected();
        ConsortiumManager.verifyPaneIncludesSettings(settingsList.sort());
        const randomSetting = Arrays.getRandomElement(settingsList);
        chooseSettingItem(randomSetting);
        ConsortiumManager.clickSelectMembers();
        SelectMembers.changeSelectAllCheckbox('check');
        SelectMembers.verifyStatusOfSelectMembersModal(1);
        verifyFoundMembersAndTotalSelected(1, 1);
        SelectMembers.changeSelectAllCheckbox('uncheck');
        verifyFoundMembersAndTotalSelected(1, 0);
        checkConsortiumManagerAfterSelectMembersSave(randomSetting, 0);

        cy.logout();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager(0);
        ConsortiumManager.verifyMembersSelected(0);
        chooseSettingItem(randomSetting);
        ConsortiumManager.clickSelectMembers();
        SelectMembers.verifyStatusOfSelectMembersModal(1);
        verifyFoundMembersAndTotalSelected(1, 0);
        checkConsortiumManagerAfterSelectMembersSave(randomSetting, 0);
      },
    );
  });
});
