import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('Manual Linking Empty Bib field to Authority 1XX', () => {
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
            DataImport.uploadFile(marcFile.marc, marcFile.fileName);
            JobProfiles.waitLoadingList();
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
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
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
  });

  it(
    'C380755 Link of empty MARC Bib field with "MARC Authority" record (spitfire)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
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
        '$0 id.loc.gov/authorities/names/n83169267',
        '',
      );

      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane('Contributor');
    },
  );
});
