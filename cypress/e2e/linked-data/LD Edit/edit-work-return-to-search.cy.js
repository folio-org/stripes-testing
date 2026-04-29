import Work from '../../../support/fragments/linked-data/work';
import TopMenu from '../../../support/fragments/topMenu';
import Marigold from '../../../support/fragments/linked-data/marigold';
import EditResource from '../../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import closeResourceModal from '../../../support/fragments/linked-data/closeResourceModal';
import { EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;

describe('Citation: return to search results - Work', () => {
  const testData = {
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    partName: `Part name ${getRandomPostfix()}`,
    workId: null,
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
    'C466101 Marigold - Returning to search results after closing/canceling/saving Work (citation)',
    { tags: ['criticalPath', 'citation', 'C466101', 'marigold', 'shiftLeft'] },
    () => {
      // Precondition: create Work via UI
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueTitle, 'Preferred Title for Work');
      EditResource.saveAndKeepEditingWithId().then(({ workId }) => {
        testData.workId = workId;
      });
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();

      // Search for created work
      SearchAndFilter.searchResourceByTitle(testData.uniqueTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 1: Open work for editing, verify button states
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkSaveButtonsDisabled();
      EditResource.checkCloseAndCancelEnabled();

      // Step 2: Click "X" close — returned to search
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 3: Edit Work, change field — save buttons become enabled
      Marigold.clickEditWorkFromSearch();
      EditResource.setValueForTheField(testData.partName, 'Part name');
      EditResource.checkSaveButtonsEnabled();

      // Step 4: Click "X" close, click "Yes" on modal — returned to search
      EditResource.clickCloseResourceButton();
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickYesButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 5: Edit Work, click browser back — returned to search
      Marigold.clickEditWorkFromSearch();
      cy.go('back');
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 6: Edit Work, click Cancel (no changes — no modal) — returned to search
      Marigold.clickEditWorkFromSearch();
      EditResource.clickCancel();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 7: Edit Work, change field, "X" close → "No" → "X" close → "Yes" — returned to search
      Marigold.clickEditWorkFromSearch();
      EditResource.setValueForTheField(testData.partName, 'Part name');
      EditResource.clickCloseResourceButton();
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickNoButton();
      closeResourceModal.verifyModalClosed();
      EditResource.clickCloseResourceButton();
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickYesButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 8: Edit Work, change field, browser back → "No" → browser back → "Yes" — returned to search
      Marigold.clickEditWorkFromSearch();
      EditResource.setValueForTheField(testData.partName, 'Part name');
      cy.go('back');
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickNoButton();
      closeResourceModal.verifyModalClosed();
      cy.go('back');
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickYesButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 9: Edit Work, change field, Cancel → "No" → Cancel → "Yes" — returned to search
      Marigold.clickEditWorkFromSearch();
      EditResource.setValueForTheField(testData.partName, 'Part name');
      EditResource.clickCancelWithOption('no');
      EditResource.clickCancelWithOption('yes');
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 10: Edit Work, change field, Save & keep editing, "X" close — returned to search
      Marigold.clickEditWorkFromSearch();
      EditResource.setValueForTheField(testData.partName, 'Part name');
      EditResource.saveAndKeepEditing();
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 11: Edit Work, change field, Save & keep editing, browser back — returned to search
      Marigold.clickEditWorkFromSearch();
      EditResource.setValueForTheField(testData.partName, 'Part name');
      EditResource.saveAndKeepEditing();
      cy.go('back');
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 12: Edit Work, change field, Save & close — returned to search
      Marigold.clickEditWorkFromSearch();
      EditResource.setValueForTheField(testData.partName, 'Part name');
      EditResource.saveAndClose();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);

      // Step 13: Edit Work, change field, Save & keep editing — save buttons become disabled
      Marigold.clickEditWorkFromSearch();
      EditResource.setValueForTheField(testData.partName, 'Part name');
      EditResource.saveAndKeepEditingWithId().then(({ workId }) => {
        testData.workId = workId;
      });
      EditResource.checkSaveButtonsDisabled();

      // Step 14: Click Cancel (no unsaved changes — no modal) — returned to search
      EditResource.clickCancel();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);
    },
  );
});
