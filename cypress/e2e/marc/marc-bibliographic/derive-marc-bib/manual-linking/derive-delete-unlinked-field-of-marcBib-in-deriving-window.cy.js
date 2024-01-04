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
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';

describe('MARC -> MARC Bibliographic -> Derive MARC bib -> Manual linking', () => {
  const testData = {
    tag100: '100',
    createdRecordIDs: [],
    bib100AfterLinkingToAuth100: [
      11,
      '100',
      '1',
      '\\',
      '$a C366579 Chin, Staceyann, $d 1972-',
      '$e Author $e Narrator',
      '$0 id.loc.gov/authorities/names/n2008052404',
      '$1 http://viaf.org/viaf/24074052',
    ],
    bib700AfterUnlinking: [
      11,
      '100',
      '1',
      '\\',
      '$a C366579 Chin, Staceyann, $d 1972- $e Author $e Narrator $0 id.loc.gov/authorities/names/n2008052404 $1 http://viaf.org/viaf/24074052',
    ],
    marcAuthIcon: 'Linked to MARC authority',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC366579.mrc',
      fileName: `C366579 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC366579.mrc',
      fileName: `C366579 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
      contributorName: 'C366579 Woodson, Jacqueline',
    },
    {
      marc: 'marcAuthFileC366579_1.mrc',
      fileName: `C366579 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];
  const linkingTagAndValues = [
    {
      tag: '100',
      rowIndex: 11,
      value: 'C366579 Chin, Staceyann, 1972-',
    },
    {
      tag: '700',
      rowIndex: 21,
      value: 'C366579 Woodson, Jacqueline',
    },
  ];

  before('Creating test data', () => {
    // make sure there are no duplicate authority records in the system
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C366579"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );
      cy.loginAsAdmin();
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
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
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
  });

  it(
    'C366579 Derive | Delete unlinked field of "MARC Bib" record in deriving window (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.deriveNewMarcBibRecord();
      QuickMarcEditor.clickKeepLinkingButton();
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
      QuickMarcEditor.clickUnlinkIconInTagField(11);
      QuickMarcEditor.confirmUnlinkingField();
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib700AfterUnlinking);
      QuickMarcEditor.checkLinkButtonExist(testData.tag100);
      QuickMarcEditor.deleteField(11);
      QuickMarcEditor.afterDeleteNotification(testData.tag100);
      QuickMarcEditor.clickSaveAndCloseThenCheck('1');
      QuickMarcEditor.confirmDeletingFields();
      QuickMarcEditor.verifyAfterDerivedMarcBibSave();
      InstanceRecordView.verifyInstancePaneExists();
      InventoryInstance.verifyContributorAbsent();
      InventoryInstance.verifyContributor(
        0,
        1,
        `${testData.marcAuthIcon}${marcFiles[1].contributorName}`,
      );
    },
  );
});
