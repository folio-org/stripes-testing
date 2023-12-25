import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { JOB_STATUS_NAMES } from '../../../../support/constants';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    tag110: '110',
    tag240: '240',
    linked240FieldValues: [
      18,
      '240',
      '1',
      '0',
      '$a C376597 Variations,',
      '',
      '$0 id.loc.gov/authorities/names/n83130832',
      '',
    ],
    authority110FieldValue: 'C376597 Variations,',
    marcBibTitle: 'Variations / Ludwig Van Beethoven.',
    updateLinkedFieldValues: [
      '$n test',
      '$f test',
      '$h test',
      '$k test',
      '$l test',
      '$m test',
      '$o test',
      '$p test',
      '$r test',
      '$s test',
      '$g test',
      '$d test',
    ],
    inventoryInstanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
    errorCalloutMessage:
      'MARC 240 has a subfield(s) that cannot be saved because the field is controlled by an authority record.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC376597.mrc',
      fileName: `testMarcFileC376597.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    },
    {
      marc: 'marcAuthFileForC376597.mrc',
      fileName: `testMarcFileC376597.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C376597 Variations,',
    },
  ];

  const createdRecordIDs = [];

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    }).then(() => {
      marcFiles.forEach((marcFile) => {
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdRecordIDs.push(link.split('/')[5]);
        });
      });
    });

    cy.visit(TopMenu.inventoryPath).then(() => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySearchOptions();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag110,
        testData.authority110FieldValue,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
      QuickMarcEditor.pressSaveAndClose();

      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
  });

  it(
    'C376597 Add controllable subfields to linked "240" field of a "MARC bib" record (linked to "110" field of "MARC authority" record) (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventorySearchAndFilter.selectSearchOptions(
        testData.inventoryInstanceSearchOption,
        testData.marcBibTitle,
      );
      InventorySearchAndFilter.clickSearch();
      InventoryInstances.selectInstanceById(createdRecordIDs[0]);
      InventoryInstance.waitLoading();

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked240FieldValues);

      testData.updateLinkedFieldValues.forEach((fifthBoxValue, index) => {
        QuickMarcEditor.updateLinkedFifthBox(18, fifthBoxValue);
        // Need to wait until empty field is updated with the first value
        if (!index) cy.wait(500);
        testData.linked240FieldValues[5] = fifthBoxValue;
        QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked240FieldValues);
        QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
        QuickMarcEditor.closeCallout();
      });
    },
  );
});
