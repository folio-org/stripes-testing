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
import Parallelization from '../../../support/dictionary/parallelization';

describe('Manual Linking Bib field to Authority 1XX', () => {
  const testData = {
    tag100: '100',
    tag010: '010',
    tag240: '240',
    authorityMarkedValue: 'Beethoven, Ludwig van,',
    authority100FieldValue:
      'Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
    authority010FieldValue: 'n  83130832',
    accordion: 'Title data',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC369092.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcFileForC369092.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const createdAuthorityIDs = [];

  before('Creating user', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
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
    });
  });

  beforeEach('Login to the application', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user', () => {
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
    createdAuthorityIDs.forEach((id, index) => {
      if (index) MarcAuthority.deleteViaAPI(id);
    });
  });

  it(
    'C369092 Link the "240" of "MARC Bib" field with "100" field with a "$t" of "MARC Authority" record. (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();

      InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
      MarcAuthorities.switchToSearch();
      InventoryInstance.verifySelectMarcAuthorityModal();
      InventoryInstance.verifySearchOptions();
      InventoryInstance.searchResults(testData.authority100FieldValue);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag010,
        `‡a ${testData.authority010FieldValue}`,
      );
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag100,
        `‡a ${testData.authorityMarkedValue}`,
      );

      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
      QuickMarcEditor.verifyTagFieldAfterLinking(
        18,
        '240',
        '1',
        '0',
        '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
        '',
        '$0 id.loc.gov/authorities/names/n83130832',
        '',
      );
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(testData.accordion);
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authorityMarkedValue);
      InventoryInstance.goToPreviousPage();

      // Wait for the content to be loaded.
      cy.wait(6000);
      InventoryInstance.viewSource();
      InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
      MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authorityMarkedValue);
      InventoryInstance.goToPreviousPage();
      MarcAuthorities.closeMarcViewPane();

      InventoryInstance.editMarcBibliographicRecord();
      QuickMarcEditor.clickUnlinkIconInTagField(18);
      QuickMarcEditor.verifyTagFieldAfterUnlinking(
        18,
        '240',
        '1',
        '0',
        '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major $0 id.loc.gov/authorities/names/n83130832',
      );
      QuickMarcEditor.checkLinkButtonExist(testData.tag240);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();

      InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);

      InventoryInstance.viewSource();
      InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
    },
  );
});
