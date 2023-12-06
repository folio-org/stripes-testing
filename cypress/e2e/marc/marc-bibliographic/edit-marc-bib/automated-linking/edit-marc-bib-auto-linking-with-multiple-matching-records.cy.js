import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Automated linking', () => {
  const testData = {
    tags: {
      tag245: '245',
      tag650: '650',
    },
    fieldContents: {
      tag245Content: 'updated 245',
      tag650Content: '$a Oratory. $2 fast $0 sh85095299C389476',
    },
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC389476.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC389476-1.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC389476-2.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  let userData = {};
  const linkableField = 650;
  const createdRecordIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
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
          JobProfiles.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          }
        });
      });

      QuickMarcEditor.setRulesForField(linkableField, true);

      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created users, Instances', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userData.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    createdRecordIDs.forEach((id, index) => {
      if (index) {
        MarcAuthority.deleteViaAPI(id);
      }
    });
  });

  it(
    'C389476 Auto-linking fields when multiple valid for linking "MARC authority" records match "$0" when editing "MARC Bib" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      // 1 Find and open detail view of record from precondition
      InventoryInstances.waitContentLoading();
      InventoryInstance.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      // 2 Click on "Actions" button in the third pane → Select "Edit MARC bibliographic record" option
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      // 3 Click on the "Link headings" button in the upper right corner of page
      QuickMarcEditor.clickLinkHeadingsButton();
      // Linkable field with "$0" subfield matching to "naturalId" field of existing "MARC authority" record was NOT linked, ex.: "650" field
      QuickMarcEditor.verifyTagFieldNotLinked(
        15,
        testData.tags.tag650,
        '\\',
        '7',
        testData.fieldContents.tag650Content,
      );
      // Error toast notification is displayed with following message, e.g.: "Field 650 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field."
      QuickMarcEditor.checkCallout(
        'Field 650 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field.',
      );
      // Enabled "Link headings" button is displayed in the upper right-hand corner of pane header
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      // 4 Update value in any field, ex.: update subfield "$a" value in "245" field
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      // 5 Click "Save & close" button
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      // 6 Click on the "Actions" in the third pane → Select "View source" option
      // Source view of edited record is opened in a new pane
      InventoryInstance.viewSource();
      // None of the fields have "MARC authority" app icon displayed next to them
      for (let i = 4; i < 18; i++) {
        InventoryViewSource.verifyLinkedToAuthorityIcon(i, false);
      }
      // Updates made at Step 4 are applied (e.g., updated "$a" value shown in "245" field)
      InventoryViewSource.contains(testData.fieldContents.tag245Content);
    },
  );
});
