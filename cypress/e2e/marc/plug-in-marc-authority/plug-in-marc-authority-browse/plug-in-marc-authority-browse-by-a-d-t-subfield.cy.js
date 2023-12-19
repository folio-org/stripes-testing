import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import InventoryEditMarcRecord from '../../../../support/fragments/inventory/inventoryEditMarcRecord';

describe('MARC -> plug-in MARC authority | Browse', () => {
  const testData = {
    createdRecordIDs: [],
    rowIndex100: 28,
    tag100content: 'valueA valueD valueT',
    rowIndex650: 43,
    tag650content: 'valueA valueD valueT',
    rowIndex240: 29,
    tag240content: 'valueA1 valueA2 valueD1 valueD2 valueT1 valueT2',
    filterStateTag100: ['personalNameTitle', 'valueA valueD valueT'],
    filterStateTag650: ['subject', 'valueA valueD valueT'],
    filterStateTag240: ['nameTitle', 'valueA1 valueA2 valueD1 valueD2 valueT1 valueT2'],
  };

  const marcFile = {
    marc: 'marcBibFileForC385657.mrc',
    fileName: `C385657 marcFile${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numOfRecords: 1,
  };

  before('Creating user', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    DataImport.verifyUploadState();
    DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
    JobProfiles.waitLoadingList();
    JobProfiles.search(marcFile.jobProfileToRun);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(marcFile.fileName);
    Logs.checkStatusOfJobProfile('Completed');
    Logs.openFileDetails(marcFile.fileName);
    for (let i = 0; i < marcFile.numOfRecords; i++) {
      Logs.getCreatedItemsID(i).then((link) => {
        testData.createdRecordIDs.push(link.split('/')[5]);
      });
    }

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    if (testData.createdRecordIDs[0]) InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
    testData.createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C385657 "$a", "$d", "$t" subfield values are shown in correct order in pre-populated browse query when linking "MARC bib" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex100);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthoritiesSearch.verifyFiltersState(
        testData.filterStateTag100[0],
        testData.filterStateTag100[1],
        'Browse',
      );
      MarcAuthorityBrowse.checkResultWithNoValue(testData.tag100content);
      InventoryInstance.closeFindAuthorityModal();
      InventoryEditMarcRecord.checkEditableQuickMarcFormIsOpened();
      QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex650);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthoritiesSearch.verifyFiltersState(
        testData.filterStateTag650[0],
        testData.filterStateTag650[1],
        'Browse',
      );
      MarcAuthorityBrowse.checkResultWithNoValue(testData.tag650content);
      InventoryInstance.closeFindAuthorityModal();
      InventoryEditMarcRecord.checkEditableQuickMarcFormIsOpened();
      QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex240);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthoritiesSearch.verifyFiltersState(
        testData.filterStateTag240[0],
        testData.filterStateTag240[1],
        'Browse',
      );
      MarcAuthorityBrowse.checkResultWithNoValue(testData.tag240content);
    },
  );
});
