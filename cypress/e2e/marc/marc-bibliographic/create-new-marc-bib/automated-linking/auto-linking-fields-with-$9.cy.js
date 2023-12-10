import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
// import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Automated linking', () => {
  const testData = {
    createdRecordIDs: [],
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: `C422151 New title ${getRandomPostfix()} $9 TEST`,
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
  };
  const linkableFields = [100, 240, 610, 711];
  const newFields = [
    {
      rowIndex: 4,
      tag: '100',
      content: '$0 3052044 $9 812ef396-4451-48b3-b99c-6e59df6330e8',
      status: 'linked',
    },
    {
      rowIndex: 5,
      tag: '240',
      content: '$0 n99036055 $9 test',
      // boxFourth: '$a Hosanna Bible',
      // boxFifth: '',
      // boxSixth: '$0 id.loc.gov/authorities/names/n99036055',
      // boxSeventh: '',
      status: 'linked',
    },
    {
      rowIndex: 6,
      tag: '610',
      content: '$a smth $0 y000111 $9 812ef396-4451-48b3-b99c-6e59df6330e0',
      status: 'not linked',
    },
    {
      rowIndex: 7,
      tag: '711',
      content: '$a smth2 $0 y000222 $9 testing',
      // boxFourth: '$a Roma Council $c Basilica di San Pietro in Roma) $d 1962-1965 : $n (2nd :',
      // boxFifth: '$j something',
      // boxSixth: '$0 id.loc.gov/authorities/names/n79084169C388560',
      // boxSeventh: '$2 fast',
      status: 'not linked',
    },
  ];
  const marcFiles = [
    {
      marc: 'marcAuthFileForC422151_1.mrc',
      fileName: `C422151_1 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC422151_2.mrc',
      fileName: `C422151_2 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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

      linkableFields.forEach((tag) => {
        QuickMarcEditor.setRulesForField(tag, true);
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  it(
    'C422151 Auto-link fields having "$9" when creating new "MARC Bib" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        `$a ${testData.fieldContents.tag245Content}`,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      newFields.forEach((newField) => {
        MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
      });
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.checkLinkButtonExist('100');
      QuickMarcEditor.checkLinkButtonExist('240');
      QuickMarcEditor.checkCallout(
        'Field 100 and 240 has been linked to MARC authority record(s).',
      );
      QuickMarcEditor.checkCallout(
        'Field 610 and 711 must be set manually by selecting the link icon.',
      );
      QuickMarcEditor.checkContent('$0 3052044', 4);
      QuickMarcEditor.checkContent('$0 n99036055', 5);
      QuickMarcEditor.checkContent('$a smth $0 y000111', 6);
      QuickMarcEditor.checkContent('$a smth2 $0 y000222', 7);
      QuickMarcEditor.checkContent('$a C422151 New title 372.0589783648469219 $9 TEST', 4);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        testData.createdInstanceID = id;
      });
      InventoryInstance.viewSource();
      newFields.forEach((newField) => {
        if (newField.status === 'linked') {
          InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, true);
        } else {
          InventoryViewSource.verifyLinkedToAuthorityIcon(newField.rowIndex + 1, false);
        }
      });
      InventoryViewSource.notContains(newFields[0].content);
      InventoryViewSource.notContains(newFields[1].content);
      InventoryViewSource.notContains(newFields[2].content);
      InventoryViewSource.notContains(newFields[3].content);
      InventoryViewSource.contains(testData.fieldContents.tag245Content);
    },
  );
});
