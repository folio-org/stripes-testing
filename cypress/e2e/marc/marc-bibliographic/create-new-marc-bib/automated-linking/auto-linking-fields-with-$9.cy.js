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
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC -> MARC Bibliographic -> Create new MARC bib -> Automated linking', () => {
  const testData = {
    createdRecordIDs: [],
    tags: {
      tag245: '245',
      tagLDR: 'LDR',
    },
    fieldContents: {
      tag245Content: `$a C422151 New title ${getRandomPostfix()} $9 TEST`,
      tagLDRContent: '00000naa\\a2200000uu\\4500',
    },
    bib100AfterLinkingToAuth100: [
      5,
      '100',
      '\\',
      '\\',
      '$a C422151 Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
      '',
      '$0 3052044',
      '',
    ],
    bib240AfterLinkingToAuth100: [
      6,
      '240',
      '\\',
      '\\',
      '$a Hosanna Bible',
      '',
      '$0 id.loc.gov/authorities/names/n99036055',
      '',
    ],
    successCalloutMessage: 'Field 100 and 240 has been linked to MARC authority record(s).',
    errorCalloutMessage: 'Field 610 and 711 must be set manually by selecting the link icon.',
  };
  const linkableFields = [
    100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811,
    830,
  ];
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
      status: 'linked',
    },
    {
      rowIndex: 6,
      tag: '610',
      content: '$a smth $0 y000111 $9 812ef396-4451-48b3-b99c-6e59df6330e0',
      contentWithout$9: '$a smth $0 y000111',
      status: 'not linked',
    },
    {
      rowIndex: 7,
      tag: '711',
      content: '$a smth2 $0 y000222 $9 testing',
      contentWithout$9: '$a smth2 $0 y000222',
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

  before('Creating test data', () => {
    // make sure there are no duplicate authority records in the system
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C422151"' }).then(
        (records) => {
          records.forEach((record) => {
            if (record.authRefType === 'Authorized') {
              MarcAuthority.deleteViaAPI(record.id);
            }
          });
        },
      );
    });

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

  after('Deleting test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    testData.createdRecordIDs.forEach((id) => {
      MarcAuthority.deleteViaAPI(id);
    });
    InventoryInstance.deleteInstanceViaApi(testData.createdInstanceID);
  });

  it(
    'C422151 Auto-link fields having "$9" when creating new "MARC Bib" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField(
        testData.tags.tag245,
        testData.fieldContents.tag245Content,
      );
      QuickMarcEditor.updateExistingField(
        testData.tags.tagLDR,
        testData.fieldContents.tagLDRContent,
      );
      newFields.forEach((newField) => {
        MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
      });
      QuickMarcEditor.clickLinkHeadingsButton();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(6);
      QuickMarcEditor.checkCallout(testData.successCalloutMessage);
      QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
      QuickMarcEditor.closeCallout();
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib100AfterLinkingToAuth100);
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib240AfterLinkingToAuth100);
      QuickMarcEditor.checkContent(newFields[2].contentWithout$9, 7);
      QuickMarcEditor.checkContent(newFields[3].contentWithout$9, 8);
      QuickMarcEditor.checkContent(testData.fieldContents.tag245Content, 4);
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
