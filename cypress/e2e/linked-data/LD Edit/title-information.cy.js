import Work from '../../../support/fragments/linked-data/work';
import TopMenu from '../../../support/fragments/topMenu';
import Marigold from '../../../support/fragments/linked-data/marigold';
import EditResource from '../../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import ViewMarc from '../../../support/fragments/linked-data/viewMarc';
import PreviewResource from '../../../support/fragments/linked-data/previewResource';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES, EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: Title Information section', () => {
  const testData = {
    marcFilePath: 'marcBibFileForC1307932.mrc',
    modifiedMarcFile: `C1307932 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C1307932 marcFile${getRandomPostfix()}.mrc`,
    mainTitle: `Test. Titles order. Main Title ${getRandomPostfix()}`,
    variantTitle: `Variant Title ${getRandomPostfix()}`,
    parallelTitle: `Parallel Title ${getRandomPostfix()}`,
    workTitle1: `Research supported by the European Research Council_1 ${getRandomPostfix()}`,
    workTitle2: `Research supported by the European Research Council_2 ${getRandomPostfix()}`,
    workTitle3: `Research supported by the European Research Council_3 ${getRandomPostfix()}`,
    marcWorkId: null,
    workId: null,
    instanceId: null,
  };

  before('Create test data', () => {
    // Replace placeholder titles in MARC file with unique test titles
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Test. Titles order. Main Title', 'Variant Title placeholder', 'Parallel Title placeholder'],
      [testData.mainTitle, testData.variantTitle, testData.parallelTitle],
    );
    cy.getAdminToken();

    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.assignCapabilitiesToExistingUser(
        user.userId,
        MARIGOLD_CAPABILITIES,
        MARIGOLD_CAPABILITY_SETS,
      );
    });

    // Upload MARC file via API
    DataImport.uploadFileViaApi(
      testData.modifiedMarcFile,
      testData.marcFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    );
  });

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    cy.getAdminToken();
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId) Work.deleteById(testData.workId);
    if (testData.marcWorkId) Work.deleteById(testData.marcWorkId);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C1307932 Marigold - Title Information section verification (citation)',
    { tags: ['criticalPath', 'citation', 'C1307932', 'marigold'] },
    () => {
      // Precondition: Navigate to Inventory, find uploaded MARC record, open in Marigold
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
        authRefresh: true,
      });

      InventoryInstances.searchByTitle(testData.mainTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();

      // Step 1: Verify order of titles on "Edit instance" page
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.verifyTitleOrder([
        testData.mainTitle,
        testData.parallelTitle,
        testData.variantTitle,
      ]);

      // Step 2: Click "Edit work" — verify same title order
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.verifyTitleOrder([
        testData.mainTitle,
        testData.parallelTitle,
        testData.variantTitle,
      ]);

      // Save work ID for cleanup
      cy.url().then((url) => {
        const match = /resources\/([^/]+)\/edit/.exec(url);
        if (match) testData.marcWorkId = match[1];
      });

      // Step 3: Close "Edit work" > Actions > New resource > Select Work profile > Create
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      cy.wait(1000);
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);

      // Verify "Title Information" section fields with default "Work Title" type
      EditResource.verifyTitleFields([
        'Non-sort character count',
        'Preferred Title for Work',
        'Part number',
        'Part name',
        'Other title information',
      ]);
      // Verify info icon contains MARC equivalents
      EditResource.clickInfoIcon();
      EditResource.verifyMarcEquivalents([
        'Non-sort character count: 245',
        'Preferred Title for Work: 245 $a',
        'Part number: 245 $n',
        'Part name: 245 $p',
        'Other title information: 245 $b',
      ]);
      EditResource.closeInfoIcon();
      // Verify Type dropdown options
      EditResource.verifyTitleTypeOptions(['Work Title', 'Variant Title', 'Parallel Title']);

      // Step 4: Change Type to "Variant Title"
      EditResource.selectTitleType('Variant Title');
      EditResource.verifyTitleFields([
        'Variant Title',
        'Part number',
        'Part name',
        'Other title information',
        'Date',
        'Variant title type',
        'Note',
      ]);
      EditResource.clickInfoIcon();
      EditResource.verifyMarcEquivalents([
        'Variant Title: 246 $a',
        'Part number: 246 $n',
        'Part name: 246 $p',
        'Other title information: 246 $b',
        'Date: 246 $f',
        'Variant title type: 246 _X',
        'Note: 246 $i',
      ]);
      EditResource.closeInfoIcon();

      // Step 5: Change Type to "Parallel Title"
      EditResource.selectTitleType('Parallel Title');
      EditResource.verifyTitleFields([
        'Parallel Title',
        'Other Title Information',
        'Part number',
        'Part name',
        'Date',
        'Note',
      ]);
      EditResource.clickInfoIcon();
      EditResource.verifyMarcEquivalents([
        'Parallel Title: 246 _1 $a',
        'Other Title Information: 246 _1',
        'Part number: 246 _1 $n',
        'Part name: 246 _1 $p',
        'Date: 246 _1 $f',
        'Note: 246 _1 $i',
      ]);
      EditResource.closeInfoIcon();

      // Step 6: Insert value to "Parallel Title" field > "Save & keep editing" > Warning toast
      EditResource.setValueForTheField(testData.workTitle2, 'Parallel Title');
      EditResource.saveAndKeepEditing();
      EditResource.verifyWarningToast('Please add the main title in order to save.');

      // Step 7: Close toast > Duplicate section twice > Set types and values > Save
      EditResource.closeToast();
      EditResource.clickDuplicateTitleSection();
      EditResource.clickDuplicateTitleSection();
      // 1st duplicated section: select "Variant Title", fill Variant Title field
      EditResource.selectTitleTypeByIndex('Variant Title', 1);
      EditResource.setValueForTitleSectionByIndex(testData.workTitle3, 'Variant Title', 1);
      // 2nd duplicated section: select "Work Title", fill Preferred Title for Work
      EditResource.selectTitleTypeByIndex('Work Title', 2);
      EditResource.setValueForTitleSectionByIndex(
        testData.workTitle1,
        'Preferred Title for Work',
        1,
      );
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId = resourceId;
      });
      // Verify title order after save
      EditResource.verifyTitleOrder([
        testData.workTitle1,
        testData.workTitle2,
        testData.workTitle3,
      ]);

      // Step 8: Click "New instance" > "Create" > click "X" close on "New instance" page
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      cy.wait(1000);
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.clickCloseResourceButton();
      // Closing New Instance navigates to search (not back to Edit Work)
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(testData.workTitle1);
      SearchAndFilter.checkSearchResultsByTitle(testData.workTitle1);
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkNewInstanceButtonEnabled();

      // Step 9: Click "New instance" > "Create" > click "Cancel" on "New instance" page
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      cy.wait(1000);
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.clickCancel();
      // Canceling New Instance navigates to search (not back to Edit Work)
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(testData.workTitle1);
      SearchAndFilter.checkSearchResultsByTitle(testData.workTitle1);
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkNewInstanceButtonEnabled();

      // Step 10: Open Type dropdown for Instance "Title information" — verify title types
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      cy.wait(1000);
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.verifyTitleTypeOptions(
        ['Instance Title', 'Variant Title', 'Parallel Title'],
        'Instance',
      );

      // Step 11: Select "Parallel Title" Type > set value > "Save & keep editing" > Warning toast
      EditResource.selectTitleType('Parallel Title', 'Instance');
      EditResource.setValueForTheField(testData.workTitle2, 'Parallel Title');
      EditResource.saveAndKeepEditing();
      EditResource.verifyWarningToast('Please add the main title in order to save.');

      // Step 12: Close toast > Duplicate 2x > Set types > Fill values > Save & keep editing
      EditResource.closeToast();
      EditResource.clickDuplicateTitleSection('Instance');
      EditResource.clickDuplicateTitleSection('Instance');
      // 1st duplicate: Variant Title type
      EditResource.selectTitleTypeByIndex('Variant Title', 1, 'Instance');
      EditResource.setValueForTitleSectionByIndex(testData.workTitle3, 'Variant Title', 1);
      // 2nd duplicate: Instance Title (Main Title)
      EditResource.selectTitleTypeByIndex('Instance Title', 2, 'Instance');
      EditResource.setValueForTitleSectionByIndex(testData.workTitle1, 'Main Title', 1);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        if (resourceId) testData.instanceId = resourceId;
      });
      // Verify info toast
      EditResource.verifyInfoToast('Resource created');
      // Verify title order
      EditResource.verifyTitleOrder([
        testData.workTitle1,
        testData.workTitle2,
        testData.workTitle3,
      ]);

      // Step 13: Close info toast > Actions > "View MARC" > verify MARC fields
      EditResource.closeToast();
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsData('245', `$a ${testData.workTitle1}`);
      ViewMarc.checkMarcFieldContainsData('246', `$a ${testData.workTitle3}`);
      ViewMarc.checkMarcFieldContainsData('246', `$a ${testData.workTitle2}`);
      ViewMarc.closeMarcView();

      // Step 14: Close "Edit instance" page > search for created Work > verify results
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(testData.workTitle1);
      SearchAndFilter.checkSearchResultsByTitle(testData.workTitle1);
      // Verify Collapse/Expand button near Work
      cy.get('[data-testid="work-details-card-toggle"]').should('be.visible');

      // Step 15: Click Collapse/Expand button — verify instance collapsed
      cy.get('[data-testid="work-details-card-toggle"]').first().click();
      cy.wait(500);
      cy.get('[class*="instance-list"]').should('not.exist');
    },
  );
});
