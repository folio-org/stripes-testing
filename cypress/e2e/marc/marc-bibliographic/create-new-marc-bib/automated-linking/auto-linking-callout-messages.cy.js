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
    tag245: '245',
    tag245Content: 'Title C389480',
    tagLDR: 'LDR',
    tagLDRContent: '00000naa\\a2200000uu\\4500',
  };

  const newFields = [
    {
      rowIndex: 4,
      tag: '100',
      content: '$0 367844',
      status: 'linked',
    },
    {
      rowIndex: 5,
      tag: '650',
      content: '$a smth $0 n00000010',
      status: 'not linked',
    },
    {
      rowIndex: 6,
      tag: '800',
      content: '$a smth $0 3052044',
      status: 'not linked',
    },
  ];

  const linkableFields = [100, 650, 800];

  const marcFiles = [
    {
      marc: 'marcAuthFileForC389480-1.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC389480-2.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC389480-3.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const createdAuthorityIDs = [];
  let createdInstanceID;

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
          Logs.waitFileIsImported(marcFile.fileName);
          Logs.checkStatusOfJobProfile('Completed');
          Logs.openFileDetails(marcFile.fileName);
          for (let i = 0; i < marcFile.numOfRecords; i++) {
            Logs.getCreatedItemsID(i).then((link) => {
              createdAuthorityIDs.push(link.split('/')[5]);
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
    createdAuthorityIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    InventoryInstance.deleteInstanceViaApi(createdInstanceID);
  });

  it(
    'C389480 All three messages shown for one field each when auto-linking  fields when creating "MARC Bib" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      // #1 Click on "Actions" button in second pane → Select "+New MARC Bib Record" option
      InventoryInstance.newMarcBibRecord();

      // #2 Fill "$a" value in "245" field
      QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.tag245Content}`);

      // #3 Replace blank values in "LDR" positions 06, 07 with valid values
      QuickMarcEditor.updateExistingField(testData.tagLDR, testData.tagLDRContent);

      // #4 - #5 Add three linkable fields -> Replace "$a" in fourth boxes of added linkable fields with "$0"
      newFields.forEach((newField) => {
        MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
      });

      // #6 Click on the "Link headings" button in the upper right corner of page
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkCallout('Field 100 has been linked to MARC authority record(s).');
      QuickMarcEditor.checkCallout('Field 650 must be set manually by selecting the link icon.');
      QuickMarcEditor.checkCallout(
        'Field 800 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field.',
      );
      QuickMarcEditor.verifyEnabledLinkHeadingsButton();

      // #7 Click "Save & close" button
      QuickMarcEditor.pressSaveAndClose();

      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdInstanceID = id;
      });

      // #8 Click on the "Actions" in the third pane → Select "View source" option
      InventoryInstance.viewSource();
      newFields.forEach((newField) => {
        if (newField.status === 'linked') {
          InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, true);
        } else {
          InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, false);
        }
      });
    },
  );
});
