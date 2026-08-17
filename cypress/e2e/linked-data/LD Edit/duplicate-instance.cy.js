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

describe('Citation: duplicate instance', () => {
  const testData = {
    workId: null,
    instanceId: null,
    duplicateInstanceId: null,
    uniqueWorkTitle: `Test work duplicate instance ${getRandomPostfix()}`,
    uniqueInstanceTitle: `Test instance duplicate instance ${getRandomPostfix()}`,
    uniqueDuplicateInstanceTitle: `Test instance duplicate instance duplicate ${getRandomPostfix()}`,
    dimensions: '12 * 24',
    lccn: '5476879576',
  };

  const resourceData = {
    workTitle: testData.uniqueWorkTitle,
    instanceTitle: testData.uniqueInstanceTitle,
    defaultDuplicateTitle: '(DUPLICATE INSTANCE) ' + testData.uniqueInstanceTitle,
    duplicateInstanceTitle: testData.uniqueDuplicateInstanceTitle,
    dimensions: testData.dimensions,
    lccn: testData.lccn,
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
    if (testData.duplicateInstanceId) Work.deleteInstanceViaApi(testData.duplicateInstanceId);
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
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
    'C552492 Marigold - Duplicate instance (citation)',
    { tags: ['criticalPath', 'citation', 'C552492', 'marigold'] },
    () => {
      // Create work
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.checkOptionSelected('Books');
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueWorkTitle, 'Preferred Title for Work');
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId = resourceId;
      });
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);

      // Create instance
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitle);
      EditResource.setSectionFieldValue(testData.dimensions, 'Dimensions');
      EditResource.setValueForSectionFieldDropdown('LCCN', 'Type', 'Identifiers');
      EditResource.setValueForTheField(testData.lccn, 'LCCN');
      EditResource.setValueForSectionSimpleField('current (current)', 'Invalid/Canceled?');
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.instanceId = resourceId;
      });

      // Check close modal button for duplicate instance modal
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.workTitle);
      Marigold.clickEditInstanceFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.duplicateInstance();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.DUPLICATE_INSTANCE);
      EditResource.checkTextValueOnField(resourceData.defaultDuplicateTitle, 'Main Title');
      EditResource.checkCloseAndCancelEnabled();
      EditResource.checkSaveButtonsEnabled();
      EditResource.checkInstanceActionsHidden();
      EditResource.checkTextValueOnField(resourceData.dimensions, 'Dimensions');
      EditResource.checkTextValueOnField(resourceData.lccn, 'LCCN');

      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();

      // Check cancel button for duplicate instance modal
      Marigold.clickEditInstanceFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.duplicateInstance();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.DUPLICATE_INSTANCE);
      EditResource.clickCancel();
      Marigold.waitLoading();

      // Check edit work from duplicate instance modal
      Marigold.clickEditInstanceFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.duplicateInstance();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.DUPLICATE_INSTANCE);
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkNewInstanceButtonHidden();

      // Check duplicating instance with new title
      EditResource.duplicateInstanceWhenMultipleActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.DUPLICATE_INSTANCE);
      EditResource.checkTextValueOnField(resourceData.defaultDuplicateTitle, 'Main Title');
      EditResource.checkCloseAndCancelEnabled();
      EditResource.checkSaveButtonsEnabled();
      EditResource.checkInstanceActionsHidden();
      EditResource.checkTextValueOnField(resourceData.dimensions, 'Dimensions');
      EditResource.checkTextValueOnField(resourceData.lccn, 'LCCN');

      EditResource.setValueForTheField(testData.uniqueDuplicateInstanceTitle, 'Main Title');
      EditResource.clickEditWork();
      UnsavedChangesModal.waitLoading();

      UnsavedChangesModal.clickDismiss();
      EditResource.clickCloseResourceButton();
      CloseResourceModal.verifyModalDisplayed();
      CloseResourceModal.clickCloseButton();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.DUPLICATE_INSTANCE);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.duplicateInstanceId = resourceId;
      });
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkTextValueOnField(resourceData.duplicateInstanceTitle, 'Main Title');
      EditResource.checkTextValueOnField(resourceData.dimensions, 'Dimensions');
      EditResource.checkTextValueOnField(resourceData.lccn, 'LCCN');

      // Check presence of duplicate in edit work view
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.verifyInstancesList();
      EditResource.verifyInstancesListTableColumns();
      EditResource.verifyInstancesListSize(2);
      EditResource.checkNewInstanceButtonEnabled();
      EditResource.checkInstanceActionsHidden();

      // Check presence of duplicate in search view
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.workTitle);
      SearchAndFilter.verifyInstanceListSize(0, 2);
    },
  );
});
