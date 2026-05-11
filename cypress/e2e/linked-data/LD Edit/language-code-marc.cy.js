import { DEFAULT_JOB_PROFILE_NAMES, EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import EditResource from '../../../support/fragments/linked-data/editResource';
import InstanceProfileModal from '../../../support/fragments/linked-data/instanceProfileModal';
import Marigold from '../../../support/fragments/linked-data/marigold';
import PreviewResource from '../../../support/fragments/linked-data/previewResource';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import ViewMarc from '../../../support/fragments/linked-data/viewMarc';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: check language MARC codes', () => {
  const testData = {
    workId: null,
    instanceId: null,
    marcFilePath: 'marcFileForC499692.mrc',
    modifiedMarcFile: `C499692 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C499692 marcFile${getRandomPostfix()}.mrc`,
    uniqueInventoryTitle: `Language code inventory ${getRandomPostfix()}`,
    uniqueMarigoldWorkTitle: `Lanuage code Marigold ${getRandomPostfix()}`,
    uniqueMarigoldInstanceTitle: `Lanuage code Marigold ${getRandomPostfix()}`,
  };

  const resourceData = {
    inventoryTitle: testData.uniqueInventoryTitle,
    marigoldWorkTitle: testData.uniqueMarigoldWorkTitle,
    marigoldInstanceTitle: testData.uniqueMarigoldInstanceTitle,
    languagesSubset: [
      'Akkadian (akk)',
      'Bemba (bem)',
      'Croatian (hrv)',
      'Kanuri (kau)',
      'Nepali (nep)',
      'Uighur (uig)',
      'Zaza (zza)',
    ],
    languageRelationships: [
      'Primary source language',
      'Summary or abstract',
      'Sung or spoken text',
      'Librettos',
      'Table of contents',
      'Accompanying material other than librettos and transcripts',
      'Original language',
      'Intertitles',
      'Subtitles',
      'Intermediate translation',
      'Original accompanying materials other than librettos',
      'Original libretto',
      'Captions',
      'Accessible audio',
      'Accessible visual language (non-textual)',
      'Accompanying transcripts for audiovisual material',
    ],
  };

  before('Create test data', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Placeholder Title Language Code'],
      [testData.uniqueInventoryTitle],
    );
    cy.getAdminToken();

    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.assignCapabilitiesToExistingUser(
        user.userId,
        MARIGOLD_CAPABILITIES,
        [
          ...MARIGOLD_CAPABILITY_SETS,
          CapabilitySets.uiInventoryInstanceView,
          CapabilitySets.uiInventoryInstanceEdit,
        ],
      );
    });

    DataImport.uploadFileViaApi(
      testData.modifiedMarcFile,
      testData.marcFileName,
      DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    );
  });

  after('Delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFile}`);
    cy.getAdminToken();
    InventoryInstances.deleteFullInstancesByTitleViaApi(resourceData.inventoryTitle);
    InventoryInstances.deleteFullInstancesByTitleViaApi(resourceData.marigoldInstanceTitle);
    Work.getInstancesByTitle(resourceData.inventoryTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === resourceData.inventoryTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
    Work.getIdByTitle(resourceData.inventoryTitle).then((id) => Work.deleteById(id));
    if (testData.instanceId) Work.deleteInstanceViaApi(testData.instanceId);
    if (testData.workId) Work.deleteById(testData.workId);
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
      authRefresh: true,
    });
  });

  it(
    'C499692 Marigold - Language Code Work / Inventory / View MARC',
    { tags: ['criticalPath', 'citation', 'C499692', 'marigold'] },
    () => {
      // Edit instance from Inventory
      InventoryInstances.searchByTitle(resourceData.inventoryTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);

      // Check work language fields
      EditResource.checkLabelOnSimpleField('English (eng)', 'Language');
      EditResource.checkDropdownTextValue('Primary source language', 'Language relationship');
      EditResource.checkSimpleFieldDropdownContainsOptions('Language', resourceData.languagesSubset);
      EditResource.checkDropdownContainsOptions('Language relationship', resourceData.languageRelationships);

      // Review MARC
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 36, 'eng');
      ViewMarc.checkMarcFieldIndicators('041', '   ');
      ViewMarc.checkMarcFieldContainsData('041', '$a eng');

      // Create new work and instance
      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueMarigoldWorkTitle, 'Preferred Title for Work');
      EditResource.setValueForSectionSimpleField('English (eng)', 'Language');
      // Primary source language is already the default language relationship selection
      EditResource.saveAndKeepEditingWithId(({ resourceId }) => {
        testData.workId = resourceId;
      });
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.openNewInstanceFormViaNewInstanceButton();
      InstanceProfileModal.waitLoading();
      InstanceProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_INSTANCE);
      EditResource.setValueForTheField(testData.uniqueMarigoldInstanceTitle, 'Main Title');
      EditResource.saveAndKeepEditingWithId(({ resourceId }) => {
        testData.instanceId = resourceId;
      });
      EditResource.clickCloseResourceButton();

      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.marigoldWorkTitle);
      SearchAndFilter.verifySearchResultField('eng');
      SearchAndFilter.openSearchResultPreviewByTitle(resourceData.marigoldWorkTitle);
      SearchAndFilter.waitPreviewLoading();
      EditResource.checkPreviewSectionContainsLink('Language code', 'Language', 'English', 'http://id.loc.gov/vocabulary/languages/eng');

      // Review in inventory
      cy.visit(TopMenu.inventoryPath);
      InventoryInstances.waitContentLoading();
      InventorySearchAndFilter.bySource('LINKED_DATA');
      InventoryInstances.searchByTitle(resourceData.marigoldInstanceTitle);
      InventoryInstance.editInstance();
      InstanceRecordEdit.waitLoading();
      InstanceRecordEdit.verifyLanguage('English');
    },
  );
});
