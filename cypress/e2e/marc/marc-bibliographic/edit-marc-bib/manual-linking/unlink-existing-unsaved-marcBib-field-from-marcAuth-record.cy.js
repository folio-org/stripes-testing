import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
// import Users from '../../../../../support/fragments/users/users';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC -> MARC Bibliographic -> Derive MARC bib -> Manual linking', () => {
  const testData = {
    createdRecordIDs: [],
  };
  const fields = [
    {
      tag: '700',
      rowIndex: 76,
      content:
        '$a C336552 Sprouse, Chris, $e artist. $0 http://id.loc.gov/authorities/names/no98105698',
      newContent: '$a',
      searchOption: 'Keyword',
      marcValue: 'C366552 Sprouse, Chris',
      bib700AfterLinkingToAuth100: [
        76,
        '700',
        '1',
        '\\',
        '$a C366552 Sprouse, Chris',
        '',
        '$0 id.loc.gov/authorities/names/nb 98017694',
        '',
      ],
      bib700AfterUnlinking: [76, '700', '1', '\\', '$a'],
    },
    {
      tag: '700',
      rowIndex: 78,
      content: '$a C366552 Sabino, Joe, $e letterer.',
      newContent: '$a C366552 Sabino, J. $e Musician',
      marcValue: 'C366552 Sabino, Joe',
      searchOption: 'Keyword',
      bib700AfterLinkingToAuth100: [
        78,
        '700',
        '1',
        '\\',
        '$a C366552 Sabino, Joe',
        '$e Musician',
        '$0 id.loc.gov/authorities/names/no2011137752',
        '',
      ],
      bib700AfterUnlinking: [78, '700', '1', '\\', '$a C366552 Sabino, J. $e Musician'],
    },
    {
      tag: '700',
      rowIndex: 79,
      content:
        '$a C366552 Lee, Stan, $d 1922-2018, $e creator. $0 http://id.loc.gov/authorities/names/n83169267',
      marcValue: 'C366552 Lee, Stan,',
      searchOption: 'Keyword',
      bib700AfterLinkingToAuth100: [
        79,
        '700',
        '1',
        '\\',
        '$a C366552 Lee, Stan, $d 1922-2018',
        '$e creator.',
        '$0 id.loc.gov/authorities/names/n83169267',
        '',
      ],
      bib700AfterUnlinking: [
        79,
        '700',
        '1',
        '\\',
        '$a C366552 Lee, Stan, $d 1922-2018, $e creator. $0 http://id.loc.gov/authorities/names/n83169267',
      ],
    },
  ];

  const marcFiles = [
    {
      marc: 'marcBibFileForC366552.mrc',
      fileName: `C366552 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC366552.mrc',
      fileName: `C366552 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC366552_1.mrc',
      fileName: `C366552 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC366552_2.mrc',
      fileName: `C366552 testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  before('Creating user and test data', () => {
    cy.loginAsAdmin();
    cy.getAdminToken().then(() => {
      MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C366552"' }).then(
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
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitFileIsUploaded();
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
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
      InventoryInstances.selectInstance();
    });
  });

  it(
    'C366552 Unlink existing unsaved linked "MARC Bib" field from "MARC Authority" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.editMarcBibliographicRecord();
      fields.forEach((field) => {
        QuickMarcEditor.checkLinkButtonExistByRowIndex(field.rowIndex);
      });
      QuickMarcEditor.updateExistingFieldContent(fields[0].rowIndex, fields[0].newContent);
      QuickMarcEditor.checkContent(fields[0].newContent, fields[0].rowIndex);
      QuickMarcEditor.updateExistingFieldContent(fields[1].rowIndex, fields[1].newContent);
      QuickMarcEditor.checkContent(fields[1].newContent, fields[1].rowIndex);
      QuickMarcEditor.clickLinkIconInTagField(fields[0].rowIndex);
      MarcAuthorities.switchToSearch();
      MarcAuthorities.searchByParameter(fields[0].searchOption, fields[0].marcValue);
      MarcAuthority.contains(
        'C366552 Sprouse, Chris',
        // testData.authority010FieldValue
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields[0].tag, fields[0].rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(...fields[0].bib700AfterLinkingToAuth100);

      QuickMarcEditor.clickLinkIconInTagField(fields[1].rowIndex);
      MarcAuthorities.switchToSearch();
      MarcAuthorities.searchByParameter(fields[1].searchOption, fields[1].marcValue);
      MarcAuthority.contains(
        'C366552 Sabino, Joe',
        // testData.authority010FieldValue
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields[1].tag, fields[1].rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(...fields[1].bib700AfterLinkingToAuth100);

      QuickMarcEditor.clickLinkIconInTagField(fields[2].rowIndex);
      MarcAuthorities.switchToSearch();
      MarcAuthorities.searchByParameter(fields[2].searchOption, fields[2].marcValue);
      MarcAuthority.contains(
        'C366552 Sabino, Joe',
        // testData.authority010FieldValue
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingUsingRowIndex(fields[2].tag, fields[2].rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(...fields[2].bib700AfterLinkingToAuth100);

      QuickMarcEditor.clickUnlinkIconInTagField(fields[0].rowIndex);
      QuickMarcEditor.confirmUnlinkingField();
      cy.wait(1000);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...fields[0].bib700AfterUnlinking);
      QuickMarcEditor.verifyIconsAfterUnlinking(fields[0].rowIndex);

      QuickMarcEditor.clickUnlinkIconInTagField(fields[1].rowIndex);
      QuickMarcEditor.confirmUnlinkingField();
      cy.wait(1000);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...fields[1].bib700AfterUnlinking);
      QuickMarcEditor.verifyIconsAfterUnlinking(fields[1].rowIndex);

      QuickMarcEditor.clickUnlinkIconInTagField(fields[2].rowIndex);
      QuickMarcEditor.confirmUnlinkingField();
      cy.wait(1000);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(...fields[2].bib700AfterUnlinking);
      QuickMarcEditor.verifyIconsAfterUnlinking(fields[2].rowIndex);
    },
  );
});
