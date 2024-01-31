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

describe('MARC -> MARC Bibliographic -> Edit MARC bib -> Manual linking', () => {
  const testData = {
    searchOption: 'Personal name',
    marcValue: 'C380755 Lee, Stan, 1922-2018',
    markedValue: 'C380755 Lee, Stan,',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380755.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC380755.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const createdAuthorityIDs = [];

  before('Creating user and records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.moduleDataImportEnabled.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
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
          },
        );
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and records', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
  });

  it(
    'C380755 Link of empty MARC Bib field with "MARC Authority" record (spitfire)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();

      QuickMarcEditor.checkLinkButtonExistByRowIndex(79);
      QuickMarcEditor.updateExistingFieldContent(79, '');
      QuickMarcEditor.clickLinkIconInTagField(79);

      MarcAuthorities.switchToBrowse();
      MarcAuthorities.checkDefaultBrowseOptions();
      MarcAuthorities.searchByParameter(testData.searchOption, testData.marcValue);
      MarcAuthorities.selectTitle(testData.marcValue);
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
      InventoryInstance.clickLinkButton();

      QuickMarcEditor.verifyAfterLinkingUsingRowIndex('700', 79);
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(79);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        79,
        '700',
        '1',
        '\\',
        '$a C380755 Lee, Stan, $d 1922-2018',
        '',
        '$0 http://id.loc.gov/authorities/names/n83169267',
        '',
      );

      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane('Contributor');
    },
  );
});
