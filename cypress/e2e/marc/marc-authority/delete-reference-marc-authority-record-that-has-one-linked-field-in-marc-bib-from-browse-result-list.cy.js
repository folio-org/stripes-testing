import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesBrowseSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesBrowseSearch';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Authority', () => {
  const testData = {
    createdRecordIDs: [],
    marcValue: 'C423379 Beethoven, Ludwig van, 1770-1827. 14 Variationen über ein Originalthema',
    markedValue: 'C423379 Beethoven, Ludwig van,',
    searchOption: 'Name-title',
    authorized: 'Authorized',
    reference: 'Reference',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileForC423379.mrc',
      fileName: `C423379 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC423379.mrc',
      fileName: `C423379 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  const linkingTagAndValues = {
    rowIndex: 18,
    value: 'C423379 Beethoven, Ludwig van,',
    tag: 240,
    content: '$a C423379 Variations, $m piano. $k Selections',
  };

  before('Creating test data', () => {
    // make sure there are no duplicate authority records in the system before auto-linking
    cy.getAdminToken();
    MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C423379"' }).then(
      (records) => {
        records.forEach((record) => {
          if (record.authRefType === 'Authorized') {
            MarcAuthority.deleteViaAPI(record.id);
          }
        });
      },
    );

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.loginAsAdmin().then(() => {
        marcFiles.forEach((marcFile) => {
          cy.visit(TopMenu.dataImportPath);
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
        });
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.verifySearchOptions();
        InventoryInstance.searchResults(linkingTagAndValues.value);
        MarcAuthorities.selectTitle(testData.marcValue);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
          linkingTagAndValues.tag,
          linkingTagAndValues.rowIndex,
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
      MarcAuthorities.switchToBrowse();
    });
  });

  after('Deleting user, data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
  });

  it(
    'C423379 Delete "Reference" "MARC authority" record that has one linked field in "MARC Bib" record from browse result list (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthoritiesBrowseSearch.searchBy(testData.searchOption, testData.marcValue);
      MarcAuthorities.selectTitle(testData.marcValue);
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
      MarcAuthority.delete();
      MarcAuthoritiesDelete.checkDeleteModal();
      MarcAuthoritiesDelete.confirmDelete();
      MarcAuthoritiesDelete.verifyDeleteComplete(testData.marcValue);

      cy.visit(TopMenu.inventoryPath);
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        linkingTagAndValues.rowIndex,
        '240',
        '1',
        '0',
        '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major $0 id.loc.gov/authorities/names/n83130832423379',
      );
      QuickMarcEditor.verifyIconsAfterUnlinking(linkingTagAndValues.rowIndex);
      QuickMarcEditor.pressCancel();
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.viewSource();
      InventoryViewSource.verifyLinkedToAuthorityIcon(linkingTagAndValues.rowIndex - 3, false);
    },
  );
});
