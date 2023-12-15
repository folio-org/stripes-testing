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

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const testData = {
    tag100: '100',
    tag100Index: 13,
    tag245: '245',
    tag245Content: 'updated C389478',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC389478.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC389478-1.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC389478-2.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC389478-3.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const linkableFields = [100, 650, 800];
  const createdRecordIDs = [];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.user = createdUserProperties;

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

      linkableFields.forEach((tag) => {
        QuickMarcEditor.setRulesForField(tag, true);
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created users, Instances', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    createdRecordIDs.forEach((id, index) => {
      if (index) {
        MarcAuthority.deleteViaAPI(id);
      }
    });
  });

  it(
    'C389478 All three messages shown for one field each when auto-linking  fields when editing "MARC Bib" record (spitfire) (null)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      // #1 Find and open detail view of record from precondition
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();

      // #2 Click on "Actions" button in the third pane → Select "Edit MARC bibliographic record" option
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();

      // #3 Click on the "Link headings" button in the upper right corner of page
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout('Field 100 has been linked to MARC authority record(s).');
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.tag100Index);
      QuickMarcEditor.checkCallout('Field 650 must be set manually by selecting the link icon.');
      QuickMarcEditor.checkCallout(
        'Field 800 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field.',
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();

      // #4 Update value in any field, e.g.:
      QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.tag245Content}`);

      // #5 Click "Save & close" button
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      // #6 Click on the "Actions" in the third pane → Select "View source" option
      InventoryInstance.viewSource();
      // * Only first linkable field from Preconditions has "MARC authority" app icon displayed next to it (e.g., "100")
      for (let i = 4; i < 29; i++) {
        if (i === testData.tag100Index) {
          InventoryViewSource.verifyLinkedToAuthorityIcon(i, true);
        } else {
          InventoryViewSource.verifyLinkedToAuthorityIcon(i, false);
        }
      }
      // * Updates made at Step 4 are applied (e.g., updated "$a" value shown in "245" field)
      InventoryViewSource.contains(testData.tag245Content);
    },
  );
});
