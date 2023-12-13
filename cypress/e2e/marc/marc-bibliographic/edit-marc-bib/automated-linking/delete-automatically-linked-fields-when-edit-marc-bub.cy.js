import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
// import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Automated linking', () => {
  const testData = {
    createdRecordIDs: [],
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC388518.mrc',
      fileName: `C388518 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC388518.mrc',
      fileName: `C388518 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 9,
    },
  ];

  const linkableFields = [
    100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811,
    830,
  ];

  const fields = [
    {
      tag: '100',
      rowIndex: 33,
      status: 'linked',
    },
    {
      tag: '610',
      rowIndex: 56,
      status: 'linked',
    },
    {
      tag: '700',
      rowIndex: 78,
      status: 'linked',
    },
    {
      tag: '700',
      rowIndex: 79,
    },
    {
      tag: '700',
      rowIndex: 80,
      status: 'linked',
    },
    {
      tag: '700',
      rowIndex: 81,
    },
    {
      tag: '700',
      rowIndex: 82,
      status: 'linked',
    },
    {
      tag: '700',
      rowIndex: 83,
      status: 'linked',
    },
    {
      tag: '800',
      rowIndex: 84,
    },
  ];

  before('Creating user and data', () => {
    cy.createTempUser([
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.loginAsAdmin();
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
      linkableFields.forEach((tag) => {
        QuickMarcEditor.setRulesForField(tag, true);
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
    testData.createdRecordIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C388518 Delete automatically linked fields when edit "MARC bib" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      // InventoryInstances.searchByTitle('0d2a7402-3bf7-4c4b-8902-a39a8ece9090');
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();
      QuickMarcEditor.clickLinkHeadingsButton();
      // QuickMarcEditor.checkCallout(
      //   'Field 100, 610, 700 and 800 has been linked to MARC authority record(s).',
      // );
      fields.forEach((field) => {
        QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(field.rowIndex);
      });
      QuickMarcEditor.verifyDisabledLinkHeadingsButton();
      // [fields[3], fields[5], fields[8]].forEach(field => {
      //   QuickMarcEditor.deleteField(field.rowIndex);
      //   QuickMarcEditor.afterDeleteNotification(field.tag);
      // });
      // QuickMarcEditor.deleteField(79);
      // QuickMarcEditor.afterDeleteNotification('700');
      // QuickMarcEditor.deleteField(81);
      // QuickMarcEditor.afterDeleteNotification('700');
      QuickMarcEditor.deleteField(84);
      QuickMarcEditor.afterDeleteNotification('800');
      QuickMarcEditor.clickSaveAndKeepEditingButton();
      QuickMarcEditor.confirmDeletingFields();
      QuickMarcEditor.closeEditorPane();
      InventoryInstance.checkInstanceTitle(
        'Black Panther (Test: with all eligible for linking fields with and without valid subfield 0)',
      );
      InventoryInstance.viewSource();
      fields.forEach((field) => {
        if (field.status === 'linked') {
          InventoryViewSource.verifyLinkedToAuthorityIcon(field.rowIndex, true);
        }
      });
    },
  );
});
