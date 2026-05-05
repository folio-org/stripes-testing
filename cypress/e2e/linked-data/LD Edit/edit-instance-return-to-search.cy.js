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
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const partNameField = 'Part name';
let user;

describe('Citation: return to search results - Instance', () => {
  const testData = {
    uniqueTitleWork: `Cypress test ${getRandomPostfix()}`,
    uniqueTitleInstance: `Cypress test ${getRandomPostfix()}`,
    partName: `Part name ${getRandomPostfix()}`,
    workId: null,
    instanceId: null,
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
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
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
    'C468225 Marigold - Returning to search results after closing/canceling/saving Instance (citation)',
    { tags: ['criticalPath', 'citation', 'C468225', 'marigold'] },
    () => {
      // Precondition: create Work and Instance via UI
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      cy.wait(1000);
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueTitleWork, 'Preferred Title for Work');
      EditResource.saveAndKeepEditingWithId().then(({ workId }) => {
        testData.workId = workId;
      });
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      cy.wait(1000);
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.setValueForTheField(testData.uniqueTitleInstance, 'Main Title');
      EditResource.saveAndKeepEditingWithId().then(({ instanceId }) => {
        testData.instanceId = instanceId;
      });
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();

      // Search for created instance
      SearchAndFilter.searchResourceByTitle(testData.uniqueTitleInstance);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 1: Open instance for editing, verify button states
      Marigold.clickEditInstanceFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkSaveButtonsDisabled();
      EditResource.checkCloseAndCancelEnabled();
      EditResource.checkEditWorkButtonEnabled();

      // Step 2: Click "X" close — returned to search
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 3: Edit Instance, change field — save buttons become enabled
      Marigold.clickEditInstanceFromSearch();
      EditResource.setValueForTheField(testData.partName, partNameField);
      EditResource.checkSaveButtonsEnabled();

      // Step 4: Click "X" close, click "Yes" on modal — returned to search
      EditResource.clickCloseResourceButton();
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickYesButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 5: Edit Instance, click browser back — returned to search
      Marigold.clickEditInstanceFromSearch();
      cy.go('back');
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 6: Edit Instance, click Cancel (no changes — no modal) — returned to search
      Marigold.clickEditInstanceFromSearch();
      EditResource.clickCancel();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 7: Edit Instance, change field, "X" close → "No" → "X" close → "Yes" — returned to search
      Marigold.clickEditInstanceFromSearch();
      EditResource.setValueForTheField(testData.partName, partNameField);
      EditResource.clickCloseResourceButton();
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickNoButton();
      closeResourceModal.verifyModalClosed();
      EditResource.clickCloseResourceButton();
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickYesButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 8: Edit Instance, change field, browser back → "No" → browser back → "Yes" — returned to search
      Marigold.clickEditInstanceFromSearch();
      EditResource.setValueForTheField(testData.partName, partNameField);
      cy.go('back');
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickNoButton();
      closeResourceModal.verifyModalClosed();
      cy.go('back');
      closeResourceModal.verifyModalDisplayed();
      closeResourceModal.clickYesButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 9: Edit Instance, change field, Cancel → "No" → Cancel → "Yes" — returned to search
      Marigold.clickEditInstanceFromSearch();
      EditResource.setValueForTheField(testData.partName, partNameField);
      EditResource.clickCancelWithOption('no');
      EditResource.clickCancelWithOption('yes');
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 10: Edit Instance, change field, Save & keep editing, "X" close — returned to search
      Marigold.clickEditInstanceFromSearch();
      EditResource.setValueForTheField(testData.partName, partNameField);
      EditResource.saveAndKeepEditing();
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 11: Edit Instance, change field, Save & keep editing, browser back — returned to search
      Marigold.clickEditInstanceFromSearch();
      EditResource.setValueForTheField(testData.partName, partNameField);
      EditResource.saveAndKeepEditing();
      cy.go('back');
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 12: Edit Instance, change field, Save & close — returned to search
      Marigold.clickEditInstanceFromSearch();
      EditResource.setValueForTheField(testData.partName, partNameField);
      EditResource.saveAndClose();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);

      // Step 13: Edit Instance, change field, Save & keep editing — save buttons become disabled
      Marigold.clickEditInstanceFromSearch();
      EditResource.setValueForTheField(testData.partName, partNameField);
      EditResource.saveAndKeepEditingWithId().then(({ instanceId }) => {
        testData.instanceId = instanceId;
      });
      EditResource.checkSaveButtonsDisabled();

      // Step 14: Click Cancel (no unsaved changes — no modal) — returned to search
      EditResource.clickCancel();
      Marigold.waitLoading();
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitleInstance);
    },
  );
});
