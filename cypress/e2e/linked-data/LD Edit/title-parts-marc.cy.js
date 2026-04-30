import { DEFAULT_JOB_PROFILE_NAMES, EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import Marigold from '../../../support/fragments/linked-data/marigold';
import Work from '../../../support/fragments/linked-data/work';
import EditResource from '../../../support/fragments/linked-data/editResource';
import ExternalResourcePreview from '../../../support/fragments/linked-data/externalResourcePreview';
import ViewMarc from '../../../support/fragments/linked-data/viewMarc';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: check title parts MARC codes', () => {
  const testData = {
    marcFilePath: 'marcFileForC466260.mrc',
    modifiedMarcFile: `C466260 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C466260 marcFile${getRandomPostfix()}.mrc`,
    uniqueMainTitle: `Digital Libraries and Knowledge Systems ${getRandomPostfix()}`,
    uniqueVariantTitle: `Digital Library Systems ${getRandomPostfix()}`,
  };

  const resourceData = {
    inventoryTitle: `${testData.uniqueMainTitle} Principles, Technologies, and Applications Vol. 1 Foundations and Architecture`,
    resourceTitle: testData.uniqueMainTitle,
    marc245: `$a ${testData.uniqueMainTitle} $b Principles, Technologies, and Applications $n Vol. 1 $p Foundations and Architecture`,
    marc246: `$a ${testData.uniqueVariantTitle} $b DLKS $f 2024 $i Alternative title used in conference citations $n Volume 1 $p Architecture of Modern Digital Libraries`,
    mainTitlePreferred: testData.uniqueMainTitle,
    mainTitleNonSortNum: '2',
    mainTitlePartNumber: 'Vol. 1',
    mainTitlePartName: 'Foundations and Architecture',
    mainTitleOther: 'Principles, Technologies, and Applications',
    variantTitle: testData.uniqueVariantTitle,
    variantTitlePartNumber: 'Volume 1',
    variantTitlePartName: 'Architecture of Modern Digital Libraries',
    variantTitleOther: 'DLKS',
    variantTitleDate: '2024',
    variantTitleType: '-',
    variantTitleNote: 'Alternative title used in conference citations',
  };

  const previewFields = {
    sectionTitle: 'Title Information',
    mainTitlePreferred: 'Preferred Title for Work',
    mainTitleNonSortNum: 'Non-sort character count',
    mainTitlePartNumber: 'Part number',
    mainTitlePartName: 'Part name',
    mainTitleOther: 'Other title information',
    variantTitle: 'Variant Title',
    variantTitlePartNumber: 'Part number',
    variantTitlePartName: 'Part name',
    variantTitleOther: 'Other title information',
    variantTitleDate: 'Date',
    variantTitleType: 'Variant title type',
    variantTitleNote: 'Note',
  };

  before('Create test data', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Digital Libraries and Knowledge Systems', 'Digital Library Systems'],
      [testData.uniqueMainTitle, testData.uniqueVariantTitle],
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
    Work.getInstancesByTitle(resourceData.resourceTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === resourceData.resourceTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
    Work.getIdByTitle(resourceData.resourceTitle).then((id) => Work.deleteById(id));
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
    'C466260 Marigold - Verify View MARC option and page / Work preview', 
    { tags: ['criticalPath', 'citation', 'C466260', 'marigold'] },
    () => {
      // Edit instance
      InventoryInstances.searchByTitle(testData.uniqueMainTitle);
      InventoryInstance.editInstanceInMG();
      ExternalResourcePreview.waitLoading();
      ExternalResourcePreview.clickContinueButton();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);

      // View MARC
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldIndicators(245, '  2');
      ViewMarc.checkMarcFieldContainsData(245, resourceData.marc245);
      ViewMarc.checkMarcFieldIndicators(246, '   ');
      ViewMarc.checkMarcFieldContainsData(246, resourceData.marc246);
 
      // Return to instance edit
      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);

      // Review work preview
      EditResource.checkPreviewOpen();
      // Main title
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.mainTitlePreferred, resourceData.mainTitlePreferred);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.mainTitleNonSortNum, resourceData.mainTitleNonSortNum);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.mainTitlePartNumber, resourceData.mainTitlePartNumber);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.mainTitlePartName, resourceData.mainTitlePartName);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.mainTitleOther, resourceData.mainTitleOther);
      // Variant title
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.variantTitle, resourceData.variantTitle);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.variantTitlePartNumber, resourceData.variantTitlePartNumber);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.variantTitlePartName, resourceData.variantTitlePartName);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.variantTitleOther, resourceData.variantTitleOther);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.variantTitleDate, resourceData.variantTitleDate);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.variantTitleType, resourceData.variantTitleType);
      EditResource.checkPreviewContains(previewFields.sectionTitle, previewFields.variantTitleNote, resourceData.variantTitleNote);
    }
  );
});
