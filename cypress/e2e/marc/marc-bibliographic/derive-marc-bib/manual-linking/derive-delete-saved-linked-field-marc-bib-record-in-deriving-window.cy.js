import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Derive MARC bib -> Manual linking', () => {
  const testData = {
    tag700: '700',
    createdRecordIDs: [],
    contributor: 'Coates, Ta-Nehisi',
    bib100AfterLinkingToAuth100: [
      33,
      '100',
      '1',
      '\\',
      '$a C366574 Coates, Ta-Nehisi',
      '$e author.',
      '$0 id.loc.gov/authorities/names/n2008001084',
      '',
    ],
    bib700AfterLinkingToAuth100: [
      76,
      '700',
      '1',
      '\\',
      '$a C366574 Sprouse, Chris',
      '$e artist.',
      '$0 id.loc.gov/authorities/names/nb98017694',
      '',
    ],
    marcAuthIcon: 'Linked to MARC authority',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC366574.mrc',
      fileName: `C366574 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC366574.mrc',
      fileName: `C366574 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
      contributorName: 'C366574 Sprouse, Chris',
    },
    {
      marc: 'marcAuthFileC366574_1.mrc',
      fileName: `C366574 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
      contributorName: 'C366574 Coates, Ta-Nehisi',
    },
  ];
  const linkingTagAndValues = [
    {
      tag: '100',
      rowIndex: 33,
      value: 'C366574 Coates, Ta-Nehisi',
    },
    {
      tag: '700',
      rowIndex: 76,
      value: 'C366574 Sprouse, Chris',
    },
  ];

  before('Creating test data', () => {
    cy.loginAsAdmin();
    // make sure there are no duplicate authority records in the system
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C366574"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );
      marcFiles.forEach((marcFile) => {
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
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

    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        linkingTagAndValues.forEach((linking) => {
          QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(linking.value);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
        });
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
    MarcAuthority.deleteViaAPI(testData.createdRecordIDs[2]);
  });

  it(
    'C366574 Derive | Delete saved linked field of "MARC Bib" record in deriving window (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.deriveNewMarcBibRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib700AfterLinkingToAuth100);
      QuickMarcEditor.deleteField(76);
      QuickMarcEditor.afterDeleteNotification(testData.tag700);
      QuickMarcEditor.clickSaveAndCloseThenCheck(1);
      QuickMarcEditor.confirmDeletingFields();
      QuickMarcEditor.verifyAfterDerivedMarcBibSave();
      InventoryInstance.verifyContributorAbsent(marcFiles[1].contributorName);
      InventoryInstance.verifyContributor(
        0,
        1,
        `${testData.marcAuthIcon}${marcFiles[2].contributorName}`,
      );
    },
  );
});
