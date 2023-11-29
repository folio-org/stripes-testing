import TestTypes from '../../../../../support/dictionary/testTypes';
import DevTeams from '../../../../../support/dictionary/devTeams';
import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
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
    tag700: '700',
    rowIndex: 56,
    createdRecordsIDs: [],
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC380760.mrc',
      fileName: `testMarcFileC380760${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC380760.mrc',
      fileName: `testMarcFileC380760${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C380760 Coates, Ta-Nehisi',
      numOfRecords: 1,
    },
  ];
  const bib700AfterLinkingToAuth100 = [
    testData.rowIndex,
    testData.tag700,
    '\\',
    '\\',
    '$a Coates, Ta-Nehis',
    '',
    '$0 id.loc.gov/authorities/names/n2008001084',
    '',
  ];

  before('Creating user and test data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    cy.getAdminToken().then(() => {
      marcFiles.forEach((marcFile) => {
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
            testData.createdRecordsIDs.push(link.split('/')[5]);
          });
        }
        cy.visit(TopMenu.dataImportPath);
      });
      // cy.visit(TopMenu.inventoryPath).then(() => {
      //   InventoryInstance.searchByTitle(createdRecordsIDs[0]);
      //   InventoryInstances.selectInstance();
      //   InventoryInstance.editMarcBibliographicRecord();
      //   linkingTagAndValues.forEach((linking) => {
      //     QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
      //     MarcAuthorities.switchToSearch();
      //     InventoryInstance.verifySelectMarcAuthorityModal();
      //     InventoryInstance.verifySearchOptions();
      //     InventoryInstance.searchResults(linking.value);
      //     InventoryInstance.clickLinkButton();
      //     QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
      //   });
      //   QuickMarcEditor.pressSaveAndClose();
      //   QuickMarcEditor.checkAfterSaveAndClose();
      // });
    });

    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userData = createdUserProperties;

      cy.login(testData.userData.username, testData.userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.searchByTitle(testData.createdRecordsIDs[0]);
      InventoryInstances.selectInstance();
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(testData.createdRecordsIDs[0]);
    MarcAuthority.deleteViaAPI(testData.createdRecordsIDs[1]);
  });

  it(
    'C380760 Derive | Delete created linked field of "MARC Bib" record in deriving window (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.deriveNewMarcBib();
      QuickMarcEditor.addNewField(testData.tag700, '', testData.rowIndex);
      QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.searchResults(marcFiles[1].authorityHeading);
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag700);
      QuickMarcEditor.checkUnlinkTooltipText(
        testData.rowIndex,
        'Unlink from MARC Authority record',
      );
      QuickMarcEditor.checkViewMarcAuthorityTooltipText(testData.rowIndex);
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
      QuickMarcEditor.deleteFieldAndCheck(testData.rowIndex, testData.tag700);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndCloseDerive();
      InventoryInstance.verifyContributorAbsent();
    },
  );
});
