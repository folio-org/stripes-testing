import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../support/fragments/data_import/dataImport';
import Logs from '../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../support/utils/stringTools';
import MarcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';

describe('MARC -> MARC Bibliographic -> Edit MARC bib', () => {
  const testData = {
    tag: '100',
    rowIndex: 16,
    marcValue: 'C375954 Kerouac, Jack',
    instanceValue: 'C375954 On the road [sound recording] / Jack Kerouac.',
    errorMessage:
      'MARC 100 has a subfield(s) that cannot be saved because the field is controlled by an authority record.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC375954.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileForC375954.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const createdRecordsIDs = [];

  before('Creating user and data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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
                createdRecordsIDs.push(link.split('/')[5]);
              });
            }
          },
        );
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.waitContentLoading();
        InventoryInstance.searchByTitle(createdRecordsIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(testData.marcValue);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag, testData.rowIndex);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Deleting created user and data', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordsIDs[1]);
  });

  it(
    'C375954 Add controllable subfield to a linked field in "MARC bib" record (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.searchByTitle(testData.instanceValue);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.fillEmptyTextAreaOfField(
        16,
        'records[16].subfieldGroups.uncontrolledAlpha',
        '$e author. $d test',
      );
      // wait for the data will be filled in.
      cy.wait(1000);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessage);
      QuickMarcEditor.fillEmptyTextAreaOfField(
        16,
        'records[16].subfieldGroups.uncontrolledAlpha',
        '$e author.',
      );
      QuickMarcEditor.fillEmptyTextAreaOfField(
        16,
        'records[16].subfieldGroups.uncontrolledNumber',
        '$c 123',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.errorMessage);
    },
  );
});
