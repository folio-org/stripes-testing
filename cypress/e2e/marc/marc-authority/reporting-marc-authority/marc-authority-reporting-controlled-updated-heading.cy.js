import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

const testData = {
  marcValue: 'C380531 Beethoven, Ludwig van,',
  tag100: '100',
  title:
    'Beethoven, Ludwig the Greatest $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
  updatedTag100Value1:
    '$a C380531 Beethoven, Ludwig the Greatest $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
  updatedHeading1:
    'C380531 Beethoven, Ludwig the Greatest 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
  searchOption: 'Keyword',
  sourceFileName: 'LC Name Authority file (LCNAF)',
};

const today = DateTools.getCurrentDateForFiscalYear();
const tomorrow = DateTools.getDayTomorrowDateForFiscalYear();

const marcFiles = [
  {
    marc: 'marcBibFileForC380531.mrc',
    fileName: `testMarcFileC380531.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  },
  {
    marc: 'marcAuthFileForC380531.mrc',
    fileName: `testMarcFileC380531.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create SRS MARC Authority',
    authorityHeading:
      'C380531 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
    authority010FieldValue: 'n83130007380531',
  },
];

const createdRecordIDs = [];

describe('marc', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      before('Creating user and uploading files', () => {
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
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
                Logs.getCreatedItemsID().then((link) => {
                  createdRecordIDs.push(link.split('/')[5]);
                });
              },
            );
          });

          cy.visit(TopMenu.inventoryPath).then(() => {
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // wait for detail view to be fully loaded
            cy.wait(1500);
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.marcValue);
            MarcAuthoritiesSearch.selectAuthorityByIndex(0);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag240, 18);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user and data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C380531 Data for "MARC authority headings updates (CSV)" report is generated for controlling record with updated heading ("$0"="001") (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          const expectedFirstUpdateData = {
            naturalIdOld: marcFiles[1].authority010FieldValue,
            naturalIdNew: marcFiles[1].authority010FieldValue,
            headingNew: testData.updatedHeading1,
            headingOld: marcFiles[1].authorityHeading,
            sourceFileNew: testData.sourceFileName,
            sourceFileOld: testData.sourceFileName,
            lbTotal: 1,
            lbUpdated: 1,
            startedAt: today,
            startedByUserFirstName: testData.userProperties.firstName,
            startedByUserLastName: testData.userProperties.lastName,
          };

          MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);
          MarcAuthoritiesSearch.selectAuthorityByIndex(0);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value1);
          QuickMarcEditor.saveAndKeepEditingUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);

          MarcAuthorities.verifyHeadingsUpdatesDataViaAPI(today, tomorrow, expectedFirstUpdateData);
        },
      );
    });
  });
});
