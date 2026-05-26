import { DEFAULT_JOB_PROFILE_NAMES, EDIT_RESOURCE_HEADINGS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';

import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

import EditResource from '../../../support/fragments/linked-data/editResource';
import PreviewResource from '../../../support/fragments/linked-data/previewResource';
import Marigold from '../../../support/fragments/linked-data/marigold';
import SearchAndFilter from '../../../support/fragments/linked-data/searchAndFilter';
import ViewMarc from '../../../support/fragments/linked-data/viewMarc';
import Work from '../../../support/fragments/linked-data/work';
import WorkProfileModal from '../../../support/fragments/linked-data/workProfileModal';

import {
  MARIGOLD_CAPABILITIES,
  MARIGOLD_CAPABILITY_SETS,
} from '../../../support/dictionary/marigoldCapabilities';

let user;

describe('Citation: Supplementary content (008/24-27,31) / Illustrative Content (008/18-21)', () => {
  const illustrativeContent = 'Illustrative content';
  const supplementaryContent = 'Supplementary content';

  const testData = {
    marcFilePath: 'C829885.mrc',
    modifiedMarcFile: `C829885 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C829885 marcFile${getRandomPostfix()}.mrc`,
    uniqueMarcTitle: `Supplementary content and Illustrative Content MARC ${getRandomPostfix()}`,
    uniqueLdTitle: `Supplementary content and Illustrative Content LD ${getRandomPostfix()}`,
    // Imported from MARC 008/18-21: c=charts, j=genealogical tables
    importedIllustrativeValues: ['portraits (por)', 'genealogical tables (gnt)'],
    // Imported from MARC 008/24-27: q=filmography, b=bibliography; 008/31: 1=index
    importedSupplementaryValues: [
      'index (index)',
      'filmography (film)',
      'bibliography (bibliography)',
    ],
    // Values to set on new LD work
    illustrativeToSet: 'forms (for)',
    supplementaryToSet: 'biography of creator (creatorbio)',
    // Preview labels (without codes)
    illustrativePreview: 'forms',
    supplementaryPreview: 'biography of creator',
    marcWorkId: null,
    marcInstanceId: null,
    workId: null,
  };

  const illustrativeOptions = [
    'charts (chr)',
    'coats of arms (coa)',
    'facsimiles (fac)',
    'forms (for)',
    'genealogical tables (gnt)',
    'illuminations (ilm)',
    'illustrations (ill)',
    'Illustrative Content (millus)',
    'maps (map)',
    'music (mus)',
    'phonodisc (pho)',
    'photographs (pht)',
    'plans (pln)',
    'plates (plt)',
    'portraits (por)',
    'samples (sam)',
  ];

  const supplementaryOptions = [
    'bibliography (bibliography)',
    'biography of creator (creatorbio)',
    'discography (discography)',
    'ethnologic information (ethnologicinfo)',
    'filmography (film)',
    'historical information (historicalinfo)',
    'history of performer or ensemble (performerhistory)',
    'index (index)',
    'instructional materials (instructmaterial)',
    'libretto or text (libretto)',
    'music (music)',
    'Supplementary Content (msupplcont)',
    'technical information on music (techmusic)',
    'technical/historical information on instruments (techinstruments)',
    'thematic index (thematicindex)',
  ];

  before('Create test data', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Supplementary content and Illustrative Content MARC'],
      [testData.uniqueMarcTitle],
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
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.uniqueMarcTitle);
    if (testData.marcInstanceId) Work.deleteInstanceViaApi(testData.marcInstanceId);
    if (testData.marcWorkId) Work.deleteById(testData.marcWorkId);
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
    'C829885 Marigold - Supplementary content / Illustrative Content - 008 fields (citation)',
    { tags: ['criticalPath', 'citation', 'C829885', 'marigold'] },
    () => {
      // Import MARC bib into Marigold
      InventoryInstances.searchByTitle(testData.uniqueMarcTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);

      // Step 1: Actions > View MARC > Verify 008 positions
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      // 008/18-21: c=charts, j=genealogical tables
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 19, 'cj');
      // 008/24-27: q, b
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 25, 'qb');
      // 008/31: 1
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 32, '1');

      // Step 2: Close View MARC > Edit Work > Verify field values
      ViewMarc.closeMarcView();
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      testData.importedIllustrativeValues.forEach((value) => {
        EditResource.checkLabelOnSectionSimpleField(value, illustrativeContent);
      });
      testData.importedSupplementaryValues.forEach((value) => {
        EditResource.checkLabelOnSectionSimpleField(value, supplementaryContent);
      });

      // Step 3: Remove portraits for Illustrative, index and filmography for Supplementary
      // Delete repeat group sections (position 1 = portraits, leaving genealogical tables)
      EditResource.deleteRepeatGroup(illustrativeContent, 1);
      // Delete index (now position 1), then filmography (now position 1), leaving bibliography
      EditResource.deleteRepeatGroup(supplementaryContent, 1);
      EditResource.deleteRepeatGroup(supplementaryContent, 1);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.marcWorkId = resourceId;
      });
      EditResource.editInstanceFormViaActions();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      // After removal: Illustrative 008/18-21 = j
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 19, 'j');
      // Supplementary 008/24-27 = b
      ViewMarc.checkMarcFieldContainsDataAtPosition('008', 25, 'b');
      ViewMarc.closeMarcView();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.clickCloseResourceButton();

      // Step 4: Create new LD Work > Verify sections present
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueLdTitle, 'Preferred Title for Work');
      EditResource.saveAndKeepEditing();

      // Step 5: Open Illustrative content dropdown > Verify options
      EditResource.checkSimpleFieldDropdownContainsOptions(
        illustrativeContent,
        illustrativeOptions,
      );

      // Step 6: Open Supplementary content dropdown > Verify options
      EditResource.checkSimpleFieldDropdownContainsOptions(
        supplementaryContent,
        supplementaryOptions,
      );

      // Step 7: Set values > Save & close > Search > Preview
      EditResource.setValueForSimpleField(testData.illustrativeToSet, illustrativeContent);
      EditResource.setValueForSimpleField(testData.supplementaryToSet, supplementaryContent);
      EditResource.saveAndKeepEditingWithId().then(({ resourceId }) => {
        testData.workId = resourceId;
      });
      EditResource.clickCloseResourceButton();
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(testData.uniqueLdTitle);
      Marigold.selectFromSearchTable(1);
      SearchAndFilter.waitPreviewLoading();
      EditResource.checkPreviewSectionContains(illustrativeContent, testData.illustrativePreview);
      EditResource.checkPreviewSectionContains(supplementaryContent, testData.supplementaryPreview);

      // Step 8: Edit work from preview > Verify values
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkLabelOnSectionSimpleField(testData.illustrativeToSet, illustrativeContent);
      EditResource.checkLabelOnSectionSimpleField(
        testData.supplementaryToSet,
        supplementaryContent,
      );

      // Step 9: Click Info tooltip > Verify MARC equivalents
      EditResource.toggleSingleFieldMarcTooltip(illustrativeContent);
      EditResource.checkMarcTooltipContains(illustrativeContent, '008/18-21');
      EditResource.toggleSingleFieldMarcTooltip(supplementaryContent);
      EditResource.checkMarcTooltipContains(supplementaryContent, '008/24-27');
    },
  );
});
