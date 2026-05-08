import { EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import CloseResourceModal from '../../../support/fragments/linked-data/closeResourceModal';
import EditResource from '../../../support/fragments/linked-data/editResource';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import Marigold from '../../../support/fragments/linked-data/marigold';
import NewInstance from '../../../support/fragments/linked-data/newInstance';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import UnsavedChangesModal from '../../../support/fragments/linked-data/unsavedChangesModal';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: core work and instance editor features', () => {
  const testData = {
    workId: null,
    uniqueWorkTitleFirst: `Test unsaved changes ${getRandomPostfix()}`,
    uniqueWorkTitleSecond: `Test unsaved changes ${getRandomPostfix()}`,
    uniqueWorkTitleThird: `Test unsaved changes ${getRandomPostfix()}`,
    uniqueInstanceTitleFirst: `Test unsaved changes ${getRandomPostfix()}`,
    uniqueInstanceTitleSecond: `Test unsaved changes ${getRandomPostfix()}`,
  };

  const resourceData = {
    uniqueWorkTitle: testData.uniqueWorkTitleThird,
    uniqueInstanceTitle: testData.uniqueInstanceTitleSecond,
  };

  before('Create test data', () => {
    cy.getAdminToken();

    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.assignCapabilitiesToExistingUser(
        user.userId,
        MARIGOLD_CAPABILITIES,
        MARIGOLD_CAPABILITY_SETS,
      );
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    // As unsaved changes are the focal point of testing, there aren't good places to definitively
    // capture the instance ID, so just delete all instances for all works titles used throughout.
    // Should result in only one call to deleteById if the instance was saved at interruption.
    [
      testData.uniqueWorkTitleFirst,
      testData.uniqueWorkTitleSecond,
      testData.uniqueWorkTitleThird,
    ].forEach((workTitle) => {
      Work.getInstancesByTitle(workTitle).then((instances) => {
        instances.forEach((instance) => {
          Work.deleteById(instance.id);
        });
      });
    });
    if (testData.workId) Work.deleteById(testData.workId);
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.linkedDataEditor,
      waiter: Marigold.waitLoading,
      authRefresh: true,
    });
  });

  it(
    'C496124 Marigold - Switching between Work Edit <-> Instance Edit pages/ Unsaved changes modal',
    { tags: ['criticalPath', 'citation', 'C496124', 'marigold'] },
    () => {
      // New work actions with no input
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.checkOptionSelected('Books');
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.checkSaveButtonsDisabled();
      EditResource.checkCloseAndCancelEnabled();
      EditResource.checkNewInstanceButtonDisabled();
      EditResource.checkInstanceActionsHidden();

      // New work actions with unsaved input
      EditResource.setValueForTheField(testData.uniqueWorkTitleFirst, 'Preferred Title for Work');
      EditResource.checkSaveButtonsEnabled();

      // Saved new work
      EditResource.saveAndKeepEditingWithId(({ resourceId }) => {
        testData.workId = resourceId;
      });
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkNewInstanceButtonEnabled();

      // New instance actions with no input
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.checkSaveButtonsDisabled();
      EditResource.checkCloseAndCancelEnabled();
      EditResource.checkEditWorkButtonEnabled();

      // New instance with unsaved input
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitleFirst);
      EditResource.checkSaveButtonsEnabled();

      // Unsaved changes warning, dismiss directly
      EditResource.clickEditWork();
      UnsavedChangesModal.waitLoading();
      UnsavedChangesModal.checkButtonsEnabled();
      UnsavedChangesModal.clickDismiss();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.checkTextValueOnField(testData.uniqueInstanceTitleFirst, 'Main Title');

      // Unsaved changes modal, dismissed indirectly
      EditResource.clickEditWork();
      UnsavedChangesModal.waitLoading();
      UnsavedChangesModal.clickOverlayToDismiss();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.checkTextValueOnField(testData.uniqueInstanceTitleFirst, 'Main Title');
      
      // Unsaved changes modal, continue without saving
      EditResource.clickEditWork();
      UnsavedChangesModal.waitLoading();
      UnsavedChangesModal.clickContinueWithoutSaving();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkNewInstanceButtonEnabled();
      // @@@ new fn: check instance list is empty

      // Create new instance
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitleFirst);
      EditResource.clickEditWork();
      UnsavedChangesModal.waitLoading();
      UnsavedChangesModal.clickSaveAndContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkPreviewOpen();
      EditResource.checkPreviewSectionContainsField('Title Information', 'Main Title', testData.uniqueInstanceTitleFirst);
      EditResource.checkSaveButtonsDisabled();
      EditResource.checkCloseAndCancelEnabled();

      // Unsaved work changes, dismiss directly
      EditResource.setValueForTheField(testData.uniqueWorkTitleSecond, 'Preferred Title for Work');
      EditResource.editInstanceFormViaActions();
      UnsavedChangesModal.waitLoading();
      UnsavedChangesModal.checkButtonsEnabled();
      UnsavedChangesModal.clickDismiss();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkTextValueOnField(testData.uniqueWorkTitleSecond, 'Preferred Title for Work');

      // Unsaved work changes, dismiss indirectly
      EditResource.editInstanceFormViaActions();
      UnsavedChangesModal.waitLoading();
      UnsavedChangesModal.clickOverlayToDismiss();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkTextValueOnField(testData.uniqueWorkTitleSecond, 'Preferred Title for Work');

      // Unsaved work changes, continue without saving
      EditResource.editInstanceFormViaActions();
      UnsavedChangesModal.waitLoading();
      UnsavedChangesModal.clickContinueWithoutSaving();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkPreviewSectionContainsField('Title Information', 'Preferred Title for Work', testData.uniqueWorkTitleFirst);

      // Unsaved work changes saved through modal
      EditResource.clickEditWork();
      EditResource.setValueForTheField(testData.uniqueWorkTitleSecond, 'Preferred Title for Work');
      EditResource.editInstanceFormViaActions();
      UnsavedChangesModal.waitLoading();
      UnsavedChangesModal.clickSaveAndContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkPreviewOpen();
      EditResource.checkPreviewSectionContainsField('Title Information', 'Preferred Title for Work', testData.uniqueWorkTitleSecond);

      // Back to work and then back to instance
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);

      // Update work title one final time
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.setValueForTheField(testData.uniqueWorkTitleThird, 'Preferred Title for Work');
      EditResource.saveAndKeepEditing();
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);

      // Update instance title one final time
      EditResource.setValueForTheField(testData.uniqueInstanceTitleSecond, 'Main Title');
      EditResource.saveAndKeepEditing();
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.clickCloseResourceButton();

      // Search for work
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.uniqueWorkTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.uniqueWorkTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.uniqueInstanceTitle);

      // See work preview
      // @@@ click on work title
      // @@@ check preview for title in field

      // See instance preview
      // @@@ click on instance title
      // @@@ check preview for title in field
    },
  );
});
