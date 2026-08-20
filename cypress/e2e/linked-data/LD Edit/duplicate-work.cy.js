import { EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import CloseResourceModal from '../../../support/fragments/linked-data/closeResourceModal';
import EditResource from '../../../support/fragments/linked-data/editResource';
import Marigold from '../../../support/fragments/linked-data/marigold';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: duplicate work', () => {
  const testData = {
    firstWorkId: null,
    secondWorkId: null,
    thirdWorkId: null,
    sharedWorkTitlePart: 'Test duplicate work',
    uniqueFirstWorkTitle: `Test duplicate work ${getRandomPostfix()}`,
    uniqueSecondWorkTitle: `Test duplicate work 1 ${getRandomPostfix()}`,
  };

  const resourceData = {
    firstWorkTitle: testData.uniqueFirstWorkTitle,
    firstDefaultDuplicateTitle: `(DUPLICATE WORK) ${testData.uniqueFirstWorkTitle}`,
    secondWorkTitle: testData.uniqueSecondWorkTitle,
    thirdWorkTitle: `(DUPLICATE WORK) ${testData.uniqueSecondWorkTitle}`,
    sharedWorkTitlePart: testData.sharedWorkTitlePart,
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
    if (testData.thirdWorkId) Work.deleteById(testData.firstWorkId);
    if (testData.secondWorkId) Work.deleteById(testData.secondWorkId);
    if (testData.firstWorkId) Work.deleteById(testData.thirdWorkId);
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
    'C552501 Marigold - Duplicate work (promin)',
    { tags: ['criticalPath', 'promin', 'C552501', 'marigold'] },
    () => {
      // Create first work
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.checkOptionSelected('Books');
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueFirstWorkTitle, 'Preferred Title for Work');
      EditResource.setValueForSimpleField('music (mus)', 'Illustrative content');
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.firstWorkId = resourceId;
      });
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.clickCloseResourceButton();

      // Search for first work and duplicate
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.firstWorkTitle);
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.duplicateWork();

      // Verify duplicate action results
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.DUPLICATE_WORK);
      EditResource.checkTextValueOnField(
        resourceData.firstDefaultDuplicateTitle,
        'Preferred Title for Work',
      );
      EditResource.checkLabelOnSectionSimpleField('music (mus)', 'Illustrative content');
      EditResource.checkCloseAndCancelEnabled();
      EditResource.checkSaveButtonsEnabled();
      EditResource.checkWorkActionsHidden();
      EditResource.checkNewInstanceButtonDisabled();
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();

      // Cancel duplicating work
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.duplicateWork();
      EditResource.clickCancel();
      Marigold.waitLoading();

      // Duplicate, modify, and dismiss
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.duplicateWork();
      EditResource.setValueForTheField(testData.uniqueSecondWorkTitle, 'Preferred Title for Work');
      EditResource.clickCancel();
      CloseResourceModal.verifyModalDisplayed();
      CloseResourceModal.clickCloseButton();

      // Save and verify changes
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.secondWorkId = resourceId;
      });
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkTextValueOnField(resourceData.secondWorkTitle, 'Preferred Title for Work');
      EditResource.verifyWorkWorkActionOptions();
      EditResource.checkNewInstanceButtonEnabled();

      // Search for common title fragment to find both
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.sharedWorkTitlePart);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.firstWorkTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.secondWorkTitle);

      // Search for duplicated work
      SearchAndFilter.searchResourceByTitle(resourceData.secondWorkTitle);
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.duplicateWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.DUPLICATE_WORK);
      EditResource.checkCloseAndCancelEnabled();
      EditResource.checkSaveButtonsEnabled();
      EditResource.checkWorkActionsHidden();
      EditResource.checkNewInstanceButtonDisabled();
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.thirdWorkId = resourceId;
      });
      EditResource.clickCloseResourceButton();

      // Search for second duplicated work
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.thirdWorkTitle);
      SearchAndFilter.verifyNoInstances(0);
    },
  );
});
