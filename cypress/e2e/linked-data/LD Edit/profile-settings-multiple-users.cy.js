import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import EditResource from '../../../support/fragments/linked-data/editResource';
import { EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import Marigold from '../../../support/fragments/linked-data/marigold';
import ManageProfileSettings, {
  PROFILE_COMPONENT_IDS,
} from '../../../support/fragments/linked-data/manageProfileSettings';
import NewHubPage from '../../../support/fragments/linked-data/newHubPage';
import NewInstance from '../../../support/fragments/linked-data/newInstance';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user1;
let user2;

describe('Citation: Workspaces settings. Multiple users', () => {
  const testData = {
    workTitle: `Test Profile settings ${getRandomPostfix()}`,
    workId: null,
    workId2: null,
    workId3: null,
    instanceId: null,
    instanceId2: null,
  };

  before('Create test data', () => {
    cy.getAdminToken();

    cy.createTempUser([]).then((userProperties) => {
      user1 = userProperties;
      cy.assignCapabilitiesToExistingUser(
        user1.userId,
        MARIGOLD_CAPABILITIES,
        MARIGOLD_CAPABILITY_SETS,
      );
    });

    cy.createTempUser([]).then((userProperties) => {
      user2 = userProperties;
      cy.assignCapabilitiesToExistingUser(
        user2.userId,
        MARIGOLD_CAPABILITIES,
        MARIGOLD_CAPABILITY_SETS,
      );
    });

    cy.then(() => {
      cy.login(user1.username, user1.password, {
        path: TopMenu.linkedDataEditor,
        waiter: Marigold.waitLoading,
        authRefresh: true,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    if (testData.instanceId2) Work.deleteInstanceViaApi(testData.instanceId2);
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId2) Work.deleteById(testData.workId2);
    if (testData.workId) Work.deleteById(testData.workId);
    Users.deleteViaApi(user1.userId);
    Users.deleteViaApi(user2.userId);
  });

  it(
    'C1259767 Marigold - Workspaces settings. Multiple users (citation)',
    { tags: ['criticalPath', 'citation', 'C1259767', 'marigold'] },
    () => {
      // Create LD Record as User1
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(`${testData.workTitle}.1`, 'Preferred Title for Work');
      EditResource.saveAndKeepEditing();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      NewInstance.addMainInstanceTitle(`${testData.workTitle}.1`);
      EditResource.saveAndKeepEditing();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();

      // Step 1: User1 sets Monograph as default Instance profile and Books as default Work profile
      // Switching profiles after changing checkbox triggers "Unsaved profile changes" modal — Save & continue
      Marigold.openManageProfileSettings();
      ManageProfileSettings.waitLoading();
      ManageProfileSettings.selectProfile('Monograph');
      ManageProfileSettings.setAsDefault('Monograph');
      ManageProfileSettings.selectProfile('Books');
      ManageProfileSettings.clickSaveOnModal();
      ManageProfileSettings.setAsDefault('Books');
      ManageProfileSettings.close();
      ManageProfileSettings.clickSaveOnModal();
      Marigold.waitLoading();

      // Step 2: Manage profile settings opens with Books selected and default checkbox checked
      Marigold.openManageProfileSettings();
      ManageProfileSettings.waitLoading();
      ManageProfileSettings.selectProfile('Books');
      ManageProfileSettings.checkDefaultCheckboxChecked();

      // Step 3: Open Monograph instance profile — default checkbox is checked
      ManageProfileSettings.selectProfile('Monograph');
      ManageProfileSettings.checkDefaultCheckboxChecked();

      // Step 4: Close X > New resource — no "Choose resource profile" modal, Books Work profile is default
      ManageProfileSettings.close();
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.verifyModalIsAbsent();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.checkHeadingProfile('Books');

      // Step 5: Add title, Save & keep editing, New instance — no modal, Monograph Instance profile is default
      EditResource.setValueForTheField(`${testData.workTitle}.2`, 'Preferred Title for Work');
      EditResource.saveAndKeepEditing();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.verifyModalIsAbsent();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.checkWorkPreviewLeftOfInstanceEditor();
      EditResource.checkHeadingProfile('Monograph');
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();

      // Step 6: User2 — Manage profile settings checkboxes are NOT selected
      cy.login(user2.username, user2.password, {
        path: TopMenu.linkedDataEditor,
        waiter: Marigold.waitLoading,
        authRefresh: true,
      });
      Marigold.openManageProfileSettings();
      ManageProfileSettings.waitLoading();
      ManageProfileSettings.selectProfile('Monograph');
      ManageProfileSettings.checkDefaultCheckboxNotChecked();
      ManageProfileSettings.selectProfile('Books');
      ManageProfileSettings.checkDefaultCheckboxNotChecked();

      // Step 7: Close X > New resource — "Choose resource profile" modal appears
      ManageProfileSettings.close();
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();

      // Step 8: Select Books > Create > Save & keep editing > New instance — modal appears again
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(`${testData.workTitle}.3`, 'Preferred Title for Work');
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId3 = resourceId;
      });
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();

      // Step 9: Close modal > Close Edit Work > Manage profile settings
      // Open Monograph > move Edition Statement and Provision Activity to Unused
      InstanceProfileModal.closeProfileModal();
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      Marigold.openManageProfileSettings();
      ManageProfileSettings.waitLoading();
      ManageProfileSettings.selectProfile('Monograph');
      ManageProfileSettings.moveComponentToUnused(PROFILE_COMPONENT_IDS.INSTANCE_EDITION_STATEMENT);
      ManageProfileSettings.moveComponentToUnused(
        PROFILE_COMPONENT_IDS.INSTANCE_PROVISION_ACTIVITY,
      );
      ManageProfileSettings.verifyComponentInUnused(
        PROFILE_COMPONENT_IDS.INSTANCE_EDITION_STATEMENT,
      );
      ManageProfileSettings.verifyComponentInUnused(
        PROFILE_COMPONENT_IDS.INSTANCE_PROVISION_ACTIVITY,
      );
      ManageProfileSettings.verifyCustomRadioSelected();

      // Step 10: Save & keep editing — "Profile components deselected" modal appears
      ManageProfileSettings.saveAndKeepEditing();
      ManageProfileSettings.verifyProfileComponentsDeselectedModalVisible();

      // Step 11: Save > Open Books Work profile > move Illustrative content and Government publication to Unused
      ManageProfileSettings.clickSaveOnModal();
      ManageProfileSettings.selectProfile('Books');
      ManageProfileSettings.moveComponentToUnused(PROFILE_COMPONENT_IDS.WORK_ILLUSTRATIVE_CONTENT);
      ManageProfileSettings.moveComponentToUnused(
        PROFILE_COMPONENT_IDS.WORK_GOVERNMENT_PUBLICATION,
      );
      ManageProfileSettings.verifyComponentInUnused(
        PROFILE_COMPONENT_IDS.WORK_ILLUSTRATIVE_CONTENT,
      );
      ManageProfileSettings.verifyComponentInUnused(
        PROFILE_COMPONENT_IDS.WORK_GOVERNMENT_PUBLICATION,
      );
      ManageProfileSettings.verifyCustomRadioSelected();

      // Step 12: Save & close — "Profile components deselected" modal appears
      ManageProfileSettings.saveAndClose();
      ManageProfileSettings.verifyProfileComponentsDeselectedModalVisible();

      // Step 13: Save > Search for Work > Edit Work
      // Verify Illustrative content + Government publication absent for User2
      // Verify instance preview panel shows Edition Statement + Provision Activity
      ManageProfileSettings.clickSaveOnModal();
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(`${testData.workTitle}.1`);
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkSectionAbsentInEditForm('Illustrative content');
      EditResource.checkSectionAbsentInEditForm('Government publication');
      EditResource.checkSectionPresentInPreviewPanel('Edition Statement');
      EditResource.checkSectionPresentInPreviewPanel('Provision Activity');

      // Step 14: Close Edit Work > Edit Instance
      // Verify Edition Statement + Provision Activity absent for User2
      // Verify work preview panel shows Illustrative content + Government publication
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      Marigold.clickEditInstanceFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkSectionAbsentInEditForm('Edition Statement');
      EditResource.checkSectionAbsentInEditForm('Provision Activity');
      EditResource.checkSectionPresentInPreviewPanel('Illustrative content');
      EditResource.checkSectionPresentInPreviewPanel('Government publication');

      // Step 15: Login as User1 > Search > Edit Work
      // Verify Illustrative content + Government publication PRESENT for User1
      cy.login(user1.username, user1.password, {
        path: TopMenu.linkedDataEditor,
        waiter: Marigold.waitLoading,
        authRefresh: true,
      });
      SearchAndFilter.searchResourceByTitle(`${testData.workTitle}.1`);
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkSectionPresentInEditForm('Illustrative content');
      EditResource.checkSectionPresentInEditForm('Government publication');

      // Step 16: Close Edit Work > Edit Instance
      // Verify Edition Statement + Provision Activity PRESENT for User1
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      Marigold.clickEditInstanceFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkSectionPresentInEditForm('Edition Statement');
      EditResource.checkSectionPresentInEditForm('Provision Activity');

      // Step 17: Close Edit Instance > Manage profile settings
      // Open Hubs profile > reorder Title Information to first > Save & close (no modal)
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      Marigold.openManageProfileSettings();
      ManageProfileSettings.waitLoading();
      ManageProfileSettings.selectProfile('Hubs');
      ManageProfileSettings.verifyComponentAtPosition(
        PROFILE_COMPONENT_IDS.HUB_TITLE_INFORMATION,
        'Title Information',
        2,
      );
      ManageProfileSettings.reorderComponentToFirstPosition(
        PROFILE_COMPONENT_IDS.HUB_TITLE_INFORMATION,
      );
      ManageProfileSettings.verifyComponentAtPosition(
        PROFILE_COMPONENT_IDS.HUB_TITLE_INFORMATION,
        'Title Information',
        1,
      );
      ManageProfileSettings.verifyCustomRadioSelected();
      ManageProfileSettings.saveAndClose();
      ManageProfileSettings.verifyProfileComponentsDeselectedModalNotVisible();
      Marigold.waitLoading();

      // Step 18: Switch to Hubs > New hub — Title Information appears first for User1
      SearchAndFilter.switchToHubsTab();
      Marigold.openNewHubForm();
      NewHubPage.handleProfileModalIfPresent();
      NewHubPage.waitLoading();
      EditResource.checkSectionAtPositionInEditForm('Title Information', 1);
      EditResource.clickCloseResourceButton();

      // Step 19: User2 > Hubs > New hub — default order (Creator of Hub first)

      cy.login(user2.username, user2.password, {
        path: TopMenu.linkedDataEditor,
        waiter: Marigold.waitLoading,
        authRefresh: true,
      });
      SearchAndFilter.switchToHubsTab();
      Marigold.openNewHubForm();
      NewHubPage.handleProfileModalIfPresent();
      NewHubPage.waitLoading();
      EditResource.checkSectionAtPositionInEditForm('Creator of Hub', 1);

      // Step 20: Close New hub > Switch to Works/Instances > Manage profile settings
      // Open Serials Work > move sections to Unused > Click X close > Continue without saving > Manage profile settings
      // Verify Serials Work has Profile default radio, sections still in Selected
      EditResource.clickCloseResourceButton();
      SearchAndFilter.switchToWorkInstancesTab();
      Marigold.waitLoading();
      Marigold.openManageProfileSettings();
      ManageProfileSettings.waitLoading();
      ManageProfileSettings.selectProfile('Serials Work');
      ManageProfileSettings.moveComponentToUnused(PROFILE_COMPONENT_IDS.WORK_ILLUSTRATIVE_CONTENT);
      ManageProfileSettings.moveComponentToUnused(
        PROFILE_COMPONENT_IDS.WORK_GOVERNMENT_PUBLICATION,
      );
      ManageProfileSettings.close();
      ManageProfileSettings.verifyUnsavedChangesModalVisible();
      ManageProfileSettings.clickContinueWithoutSavingOnModal();
      Marigold.waitLoading();
      Marigold.openManageProfileSettings();
      ManageProfileSettings.waitLoading();
      ManageProfileSettings.selectProfile('Serials Work');
      ManageProfileSettings.verifyProfileDefaultRadioSelected();
      ManageProfileSettings.verifyComponentInSelected(
        PROFILE_COMPONENT_IDS.WORK_ILLUSTRATIVE_CONTENT,
      );
      ManageProfileSettings.verifyComponentInSelected(
        PROFILE_COMPONENT_IDS.WORK_GOVERNMENT_PUBLICATION,
      );
      ManageProfileSettings.close();
      Marigold.waitLoading();
    },
  );
});
