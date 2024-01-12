import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> derive MARC bib -> Manual linking', () => {
  let userData = {};
  const testData = {
    tag700: '700',
    rowIndex: 76,
    content:
      '$a C365594 Sprouse, Chris, $e artist. $0 http://id.loc.gov/authorities/names/no98105698',
    createdRecordsIDs: [],
  };

  const marcAuthData = {
    tag001: '001',
    tag100: '100',
    tag001Value: '1357871',
    tag100Value: 'C365594 Sprouse, Chris',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC365594.mrc',
      fileName: `testMarcFileC365594${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC365594.mrc',
      fileName: `testMarcFileC365594${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const bib700AfterLinkingToAuth100 = [
    testData.rowIndex,
    testData.tag700,
    '1',
    '\\',
    '$a C365594 Sprouse, Chris',
    '$e artist.',
    '$0 1357871',
    '',
  ];

  const bib700AfterLinking = [72, ...bib700AfterLinkingToAuth100.slice(1)];

  before('Creating user and test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      userData = createdUserProperties;

      cy.loginAsAdmin().then(() => {
        marcFiles.forEach((marcFile) => {
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              testData.createdRecordsIDs.push(link.split('/')[5]);
            });
          }
        });
      });

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    InventoryInstance.deleteInstanceViaApi(testData.createdRecordsIDs[0]);
    MarcAuthority.deleteViaAPI(testData.createdRecordsIDs[1]);
  });

  it(
    "C365594 Derive | Link 'MARC Bib' field with '$0' subfield which doesn't match to 'MARC Authority' record. 'Authority source file' value is 'Not specified' (700 field to 100) (spitfire) (TaaS)",
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordsIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.deriveNewMarcBibRecord();
      QuickMarcEditor.checkContent(testData.content, testData.rowIndex);
      QuickMarcEditor.verifyRemoveLinkingModalAbsence();
      QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.clickReset();
      MarcAuthorities.switchToSearch();
      InventoryInstance.searchResults(marcAuthData.tag100Value);
      InventoryViewSource.contains(`${marcAuthData.tag001}\t${marcAuthData.tag001Value}`);
      InventoryViewSource.contains(`${marcAuthData.tag100}\t1  \t$a ${marcAuthData.tag100Value} `);
      InventoryInstance.closeDetailsView();
      MarcAuthorities.clickLinkIcon();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.rowIndex);
      QuickMarcEditor.checkUnlinkTooltipText(
        testData.rowIndex,
        'Unlink from MARC Authority record',
      );
      QuickMarcEditor.checkViewMarcAuthorityTooltipText(testData.rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
      QuickMarcEditor.checkCallout('Field 700 has been linked to a MARC authority record.');
      QuickMarcEditor.pressSaveAndClose();
      InventoryInstances.verifyInstanceDetailsView();
      cy.wait(3000);
      QuickMarcEditor.checkCallout('Record created.');
      InventoryInstance.verifyContributorWithMarcAppLink(2, 1, marcAuthData.tag100Value);
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinking);
    },
  );
});
