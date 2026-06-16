import { EDIT_RESOURCE_HEADINGS } from '../../../support/constants';

import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';

import EditResource from '../../../support/fragments/linked-data/editResource';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import Marigold from '../../../support/fragments/linked-data/marigold';
import NewInstance from '../../../support/fragments/linked-data/newInstance';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: check long title, local vocabularies, inventory view', () => {
  const longTitle =
    'Title of the item described in the record and variant and former titles that also apply to that item. Field 245 (Title Statement) contains the title as it appears on the chief title source for an item (or substitute for such, formulated according to cataloging guidelines). The uniform title is the primary collecting title for items appearing under multiple titles and the key title is a special unique title for serials. These fields may be used to generate access points and display notes for the various titles, frequently guided by indicator values associated with the fields when entered under a name heading.';
  const testData = {
    workId: null,
    instanceId: null,
    uniqueWorkTitle: `${longTitle} ${getRandomPostfix()}`,
    uniqueInstanceTitle: `${longTitle} ${getRandomPostfix()}`,
  };

  const fieldNames = {
    titleSection: 'Title Information',
    workTitle: 'Preferred Title for Work',
    instanceTitle: 'Main Title',
    place: 'Search place of publication',
    issuance: 'Mode of Issuance',
    status: 'Invalid/Canceled?',
    noteType: 'Note type',
    mediaType: 'Media type',
    carrierType: 'Carrier type',
    language: 'Language',
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
    'C446070 Marigold - Work/Instance edit page / Local vocabularies (citation)',
    { tags: ['criticalPath', 'citation', 'C446070', 'marigold'] },
    () => {
      // Create work and instance
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueWorkTitle, fieldNames.workTitle);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId = resourceId;
      });
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitle);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.instanceId = resourceId;
      });
      EditResource.clickCloseResourceButton();

      // Search for work, verify search display has no overlapping elements
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(testData.uniqueWorkTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueWorkTitle);
      SearchAndFilter.checkTitleNoOverlap();

      // Edit instance, verify vocabularies are loading from FOLIO and not an external resource
      cy.intercept('GET', /^.*\/vocabular(y|ies)\/.*$/).as('vocabularies');
      Marigold.editInstanceFromSearchTable(1, 1);
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.openSimpleFieldMenu(fieldNames.place);
      EditResource.openSimpleSectionFieldMenu(fieldNames.issuance);
      EditResource.openSimpleFieldMenu(fieldNames.status);
      EditResource.openSimpleFieldMenu(fieldNames.noteType);
      EditResource.openSimpleSectionFieldMenu(fieldNames.mediaType);
      EditResource.openSimpleSectionFieldMenu(fieldNames.carrierType);
      EditResource.openSimpleFieldMenu(fieldNames.language);
      cy.wait('@vocabularies').then((interception) => {
        cy.location().then((here) => {
          // Compare the base domain name, back end host may not be the exact same as the front end host
          expect(interception.request.url).to.include(here.host.split('.').slice(1).join('.'));
        });
      });

      // Verify work preview is open and contains work title
      EditResource.checkPreviewOpen();
      EditResource.checkWorkPreviewLeftOfInstanceEditor();
      EditResource.checkPreviewSectionContainsField(
        fieldNames.titleSection,
        fieldNames.workTitle,
        testData.uniqueWorkTitle,
      );

      // Verify instance editor
      EditResource.checkTextValueOnField(testData.uniqueInstanceTitle, fieldNames.instanceTitle);

      // Verify buttons
      EditResource.checkCloseAndCancelEnabled();
      EditResource.checkSaveButtonsDisabled();

      // Inventory view
      EditResource.openInventoryViewViaActions();
      InventoryInstances.waitContentLoading();
      InventoryInstance.verifyInstanceTitle(testData.uniqueInstanceTitle);

      // Return to Marigold
      InventoryInstance.editInstanceInMG();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkCloseAndCancelEnabled();
      EditResource.checkSaveButtonsDisabled();
      EditResource.checkInstancePreviewRightOfWorkEditor();
      EditResource.checkPreviewOpen();
      EditResource.checkPreviewSectionContainsField(
        fieldNames.titleSection,
        fieldNames.instanceTitle,
        testData.uniqueInstanceTitle,
      );
      EditResource.checkWorkActionsPlacement();
    },
  );
});
