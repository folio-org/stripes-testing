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

describe('Citation: check classification number MARC codes', () => {
  const testData = {
    workId: null,
    marcFilePath: 'marcFileForC490913.mrc',
    modifiedMarcFile: `C490913 editedMarcFile${getRandomPostfix()}.mrc`,
    marcFileName: `C490913 marcFile${getRandomPostfix()}.mrc`,
    uniqueInventoryTitle: `Classification numbers ${getRandomPostfix()}`,
    uniqueMarigoldTitle: `Classificaion numbers. New Work  ${getRandomPostfix()}`,
    marigoldDeweyNumber: '332.024',
    marigoldDeweyAdditional: 'W75 2016',
    marigoldDeweyEdition: '23',
    marigoldLccnNumber: '333.025',
    marigoldLccnAdditional: 'A76 2019',
    marigoldLccnUsed: 'current (current)',
  };

  const resourceData = {
    inventoryTitle: testData.uniqueInventoryTitle,
    marigoldTitle: testData.uniqueMarigoldTitle,
    marc05014: '$a TK5105.8885.W67 $b M55 2022',
    marc05000: '$a PR6056.A82 $b H37 2003',
    marc05010: '$a QA80.73.P98 $b R85 2024',
    marc08204: '$a 576.8 $b .G68 2021 $2 22 $q DNLM',
    marc08210: '$a RM301.5 $b .P54 2021 $2 25',
    marc08200: '$a QA76.73.P98 $b .R88 2024 $2 20',
    dewey1Number: '576.8',
    dewey1Additional: '.G68 2021',
    dewey1Edition: '22',
    dewey1Full: 'Full',
    dewey2Number: 'RM301.5',
    dewey2Additional: '.P54 2021',
    dewey2Edition: '25',
    dewey2Full: 'Abridged',
    dewey3Number: 'QA76.73.P98',
    dewey3Additional: '.R88 2024',
    dewey3Edition: '20',
    dewey3Full: 'Full',
    lccn1Number: 'QA80.73.P98',
    lccn1Additional: 'R85 2024',
    lccn1Used: 'not used by assigner (nuba)',
    lccn2Number: 'PR6056.A82',
    lccn2Additional: 'H37 2003',
    lccn2Used: 'used by assigner (uba)',
    lccn3Number: 'TK5105.8885.W67',
    lccn3Additional: 'M55 2022',
    lccn3Used: 'not used by assigner (nuba)',
    assigningAgency: 'United States, Library of Congress',
    caoonlAgency: 'CaOONL ,United States, Library of Congress',
    dnlmAgency: 'DNLM',
    nubaValue: 'not used by assigner',
    nubaLink: 'http://id.loc.gov/vocabulary/mstatus/nuba',
    marigoldDeweyNumber: testData.marigoldDeweyNumber,
    marigoldDeweyAdditional: testData.marigoldDeweyAdditional,
    marigoldDeweyEdition: testData.marigoldDeweyEdition,
  };

  const fieldData = {
    classificationSection: 'Classification numbers',
    classificationType: 'Type',
    classificationNumber: 'Classification number',
    classificationAdditional: 'Additional call number information',
    classificationEdition: 'Dewey Edition number',
    classificationFull: 'Dewey full or abridged?',
    classificationAssigner: 'Assigner',
    classificationAgency: 'Assigning agency',
    classificationUsed: 'Used by assigning agency?',
    dewey: 'Dewey Decimal Classification',
    lccn: 'Library of Congress Classification',
    marc050: '050',
    marc082: '082',
    workTitle: 'Preferred Title for Work',
    booksProfile: 'Books',
    usedByLabels: [
      'canceled or invalid (cancinv)',
      'ceased (ceased)',
      'changed (c)',
      'current (current)',
      'deleted (d)',
      'earliest (earliest)',
      'former (former)',
      'incomplete (incmp)',
      'incorrect (incorrect)',
      'new (n)',
      'not used by assigner (nuba)',
      'partial (part)',
      'prepublication (p)',
      'Status codes (mstatus)',
      'suppressed (s)',
      'traced (tr)',
      'transcribed (t)',
      'unknown (u)',
      'used by assigner (uba)',
    ],
  };

  before('Create test data', () => {
    DataImport.editMarcFile(
      testData.marcFilePath,
      testData.modifiedMarcFile,
      ['Placeholder Title'],
      [testData.uniqueInventoryTitle],
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
    Work.getInstancesByTitle(resourceData.inventoryTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === resourceData.inventoryTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
    Work.getIdByTitle(resourceData.inventoryTitle).then((id) => Work.deleteById(id));
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
    'C490913 Marigold - Verify the Classification numbers section/ Inventory/ Marigold/ View MARC',
    { tags: ['criticalPath', 'citation', 'C490913', 'marigold'] },
    () => {
      // Edit instance from Inventory
      InventoryInstances.searchByTitle(resourceData.inventoryTitle);
      InventoryInstance.editInstanceInMG();
      PreviewResource.waitLoading();
      PreviewResource.clickContinue();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);

      // Review MARC
      EditResource.viewMarc();
      ViewMarc.waitLoading();
      ViewMarc.checkMarcFieldIndicators(fieldData.marc050, '0 0');
      ViewMarc.checkMarcFieldContainsData(fieldData.marc050, resourceData.marc05000);
      ViewMarc.checkMarcFieldIndicators(fieldData.marc050, '1 0');
      ViewMarc.checkMarcFieldContainsData(fieldData.marc050, resourceData.marc05010);
      ViewMarc.checkMarcFieldIndicators(fieldData.marc050, '1 4');
      ViewMarc.checkMarcFieldContainsData(fieldData.marc050, resourceData.marc05014);
      ViewMarc.checkMarcFieldIndicators(fieldData.marc082, '0 0');
      ViewMarc.checkMarcFieldContainsData(fieldData.marc082, resourceData.marc08200);
      ViewMarc.checkMarcFieldIndicators(fieldData.marc082, '0 4');
      ViewMarc.checkMarcFieldContainsData(fieldData.marc082, resourceData.marc08204);
      ViewMarc.checkMarcFieldIndicators(fieldData.marc082, '1 0');
      ViewMarc.checkMarcFieldContainsData(fieldData.marc082, resourceData.marc08210);
      ViewMarc.closeMarcView();

      // Review work preview
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_INSTANCE);
      EditResource.checkPreviewOpen();
      EditResource.checkPreviewSectionContainsField(fieldData.classificationSection, fieldData.classificationAgency, resourceData.assigningAgency);
      EditResource.checkPreviewSectionContainsLink(fieldData.classificationSection, fieldData.classificationUsed, resourceData.nubaValue, resourceData.nubaLink);

      // Review editor sections
      EditResource.clickEditWork();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkDropdownTextValue(fieldData.dewey, fieldData.classificationType);
      EditResource.checkTextValueOnField(resourceData.dewey1Number, fieldData.classificationNumber);
      EditResource.checkTextValueOnField(resourceData.dewey1Additional, fieldData.classificationAdditional);
      EditResource.checkTextValueOnField(resourceData.dewey1Edition, fieldData.classificationEdition);
      EditResource.checkTextValueOnField(resourceData.dewey1Full, fieldData.classificationFull);
      EditResource.checkTextValueOnDisabledField(resourceData.dnlmAgency, fieldData.classificationAssigner);
      EditResource.checkDropdownTextValue(fieldData.dewey, fieldData.classificationType);
      EditResource.checkTextValueOnField(resourceData.dewey2Number, fieldData.classificationNumber);
      EditResource.checkTextValueOnField(resourceData.dewey2Additional, fieldData.classificationAdditional);
      EditResource.checkTextValueOnField(resourceData.dewey2Edition, fieldData.classificationEdition);
      EditResource.checkTextValueOnField(resourceData.dewey2Full, fieldData.classificationFull);
      EditResource.checkTextValueOnDisabledField(resourceData.assigningAgency, fieldData.classificationAssigner);
      EditResource.checkDropdownTextValue(fieldData.dewey, fieldData.classificationType);
      EditResource.checkTextValueOnField(resourceData.dewey3Number, fieldData.classificationNumber);
      EditResource.checkTextValueOnField(resourceData.dewey3Additional, fieldData.classificationAdditional);
      EditResource.checkTextValueOnField(resourceData.dewey3Edition, fieldData.classificationEdition);
      EditResource.checkTextValueOnField(resourceData.dewey3Full, fieldData.classificationFull);
      EditResource.checkTextValueOnDisabledField(resourceData.caoonlAgency, fieldData.classificationAssigner);
      EditResource.checkDropdownTextValue(fieldData.lccn, fieldData.classificationType);
      EditResource.checkTextValueOnField(resourceData.lccn1Number, fieldData.classificationNumber);
      EditResource.checkTextValueOnField(resourceData.lccn1Additional, fieldData.classificationAdditional);
      EditResource.checkTextValueOnDisabledField(resourceData.assigningAgency, fieldData.classificationAgency);
      EditResource.checkLabelOnSimpleField(resourceData.lccn1Used, fieldData.classificationUsed);
      EditResource.checkDropdownTextValue(fieldData.lccn, fieldData.classificationType);
      EditResource.checkTextValueOnField(resourceData.lccn2Number, fieldData.classificationNumber);
      EditResource.checkTextValueOnField(resourceData.lccn2Additional, fieldData.classificationAdditional);
      EditResource.checkTextValueOnDisabledField(resourceData.assigningAgency, fieldData.classificationAgency);
      EditResource.checkLabelOnSimpleField(resourceData.lccn2Used, fieldData.classificationUsed);
      EditResource.checkDropdownTextValue(fieldData.lccn, fieldData.classificationType);
      EditResource.checkTextValueOnField(resourceData.lccn3Number, fieldData.classificationNumber);
      EditResource.checkTextValueOnField(resourceData.lccn3Additional, fieldData.classificationAdditional);
      EditResource.checkTextValueOnDisabledField('', fieldData.classificationAgency);
      EditResource.checkLabelOnSimpleField(resourceData.lccn3Used, fieldData.classificationUsed);
      EditResource.clickCloseResourceButton();

      // Create a new work
      Marigold.waitLoading();
      Marigold.openNewResourceForm();
      WorkProfileModal.waitLoading();
      WorkProfileModal.checkOptionSelected(fieldData.booksProfile);
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.NEW_WORK);
      EditResource.setValueForTheField(testData.uniqueMarigoldTitle, fieldData.workTitle);
      EditResource.saveAndKeepEditingWithId(({ resourceId }) => {
        testData.workId = resourceId;
      });

      // Verify LCCN section contents
      EditResource.checkSectionDropdownContainsOptions(fieldData.classificationSection, fieldData.classificationType, [fieldData.lccn, fieldData.dewey]);
      EditResource.checkSimpleFieldDropdownContainsOptions(fieldData.classificationUsed, fieldData.usedByLabels);
      EditResource.toggleSectionMarcTooltip(fieldData.classificationSection);
      EditResource.checkMarcTooltipContains(fieldData.classificationNumber, `${fieldData.marc050} $a`);
      EditResource.checkMarcTooltipContains(fieldData.classificationAdditional, `${fieldData.marc050} $b`);
      EditResource.checkMarcTooltipContains(fieldData.classificationAgency, `${fieldData.marc050} _0`);
      EditResource.checkMarcTooltipContains(fieldData.classificationUsed, `${fieldData.marc050} X_`);
      EditResource.toggleSectionMarcTooltip(fieldData.classificationSection);

      // Switch to Dewey classification, verify contents
      EditResource.setValueForSectionFieldDropdown(fieldData.dewey, fieldData.classificationType, fieldData.classificationSection);
      EditResource.toggleSectionMarcTooltip(fieldData.classificationSection);
      EditResource.checkMarcTooltipContains(fieldData.classificationNumber, `${fieldData.marc082} $a`);
      EditResource.checkMarcTooltipContains(fieldData.classificationAdditional, `${fieldData.marc082} $b`);
      EditResource.checkMarcTooltipContains(fieldData.classificationEdition, `${fieldData.marc082} $2`);
      EditResource.checkMarcTooltipContains(fieldData.classificationFull, `${fieldData.marc082} X_`);
      EditResource.checkMarcTooltipContains(fieldData.classificationAssigner, `${fieldData.marc082} _X`);
      EditResource.toggleSectionMarcTooltip(fieldData.classificationSection);
      EditResource.setValueForTheField(testData.marigoldDeweyNumber, fieldData.classificationNumber);
      EditResource.setValueForTheField(testData.marigoldDeweyAdditional, fieldData.classificationAdditional);
      EditResource.setValueForTheField(testData.marigoldDeweyEdition, fieldData.classificationEdition);
      EditResource.saveAndClose();
      EditResource.checkSuccessStatusDisplayed();
      // Toasts no longer auto-dismiss, so manually clear them so later checks don't test against earlier toasts
      EditResource.clearStatusMessages();

      // Reopen and verify field values
      Marigold.waitLoading();
      SearchAndFilter.searchResourceByTitle(resourceData.marigoldTitle);
      SearchAndFilter.checkSearchResultsByTitle(resourceData.marigoldTitle);
      Marigold.clickEditWorkFromSearch();
      EditResource.waitLoading(EDIT_RESOURCE_HEADINGS.EDIT_WORK);
      EditResource.checkDropdownTextValue(fieldData.dewey, fieldData.classificationType);
      EditResource.checkTextValueOnField(resourceData.marigoldDeweyNumber, fieldData.classificationNumber);
      EditResource.checkTextValueOnField(resourceData.marigoldDeweyAdditional, fieldData.classificationAdditional);
      EditResource.checkTextValueOnField(resourceData.marigoldDeweyEdition, fieldData.classificationEdition);

      // Change to LCCN and verify
      EditResource.setValueForSectionFieldDropdown(fieldData.lccn, fieldData.classificationType, fieldData.classificationSection);
      EditResource.checkTextValueOnField('', fieldData.classificationNumber);
      EditResource.checkTextValueOnField('', fieldData.classificationAdditional);
      EditResource.setValueForTheField(testData.marigoldLccnNumber, fieldData.classificationNumber);
      EditResource.setValueForTheField(testData.marigoldLccnAdditional, fieldData.classificationAdditional);
      EditResource.setValueForSectionSimpleField(testData.marigoldLccnUsed, fieldData.classificationUsed);
      EditResource.saveAndKeepEditing();
      EditResource.checkSuccessStatusDisplayed();
    },
  );
});
