import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const testData = {
        tag010: '010',
        tag100: '100',
        tag111: '111',
        tag240: '240',
        updatedTag100Value1:
          '$a C380529 Beethoven, Ludwig van, $d 1770-1827. $t Variations test 1, $m piano, violin, cello, $n op. 44, $r E♭ major',
        updatedTag100Value2:
          '$a C380529 Beethoven, Ludwig van, $d 1770-1827. $t Variations test 2, $m piano, violin, cello, $n op. 44, $r E♭ major',
        updatedTag111Value:
          '$a C380529 Delaware TEST $t Delaware symposia on language studies $f 1985 $j test $1 ert',
        updatedHeading1:
          'C380529 Beethoven, Ludwig van, 1770-1827. Variations test 1, piano, violin, cello, op. 44, E♭ major',
        updatedHeading2:
          'C380529 Beethoven, Ludwig van, 1770-1827. Variations test 2, piano, violin, cello, op. 44, E♭ major',
        updatedHeading3: 'C380529 Delaware TEST Delaware symposia on language studies 1985',
        searchOption: 'Keyword',
        sourceFileName: 'LC Name Authority file (LCNAF)',
      };

      const today = DateTools.getCurrentDateForFiscalYear();
      const tomorrow = DateTools.getDayTomorrowDateForFiscalYear();

      const marcFiles = [
        {
          marc: 'marcBibFileC380529.mrc',
          fileName: `testMarcFileC380529.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileC380529_1.mrc',
          fileName: `testMarcFileC380529.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading:
            'C380529 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
          authority010FieldValue: 'n831308323805291',
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileC380529_2.mrc',
          fileName: `testMarcFileC380529.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading:
            'C380529 Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
          authority010FieldValue: 'n847454253805292',
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Creating user and uploading files', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380529');
        InventoryInstances.deleteInstanceByTitleViaApi('C380529');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          marcFiles.forEach((marcFile) => {
            cy.getAdminToken();
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // wait for detail view to be fully loaded
            cy.wait(1500);
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag010,
              `$a ${marcFiles[1].authority010FieldValue}`,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user and data', () => {
        cy.getAdminToken();
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C380529 Data for "MARC authority headings updates (CSV)" report includes data on several heading updates for the same "MARC authority" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C380529'] },
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
          const expectedSecondUpdateData = {
            naturalIdOld: marcFiles[1].authority010FieldValue,
            naturalIdNew: marcFiles[1].authority010FieldValue,
            headingNew: testData.updatedHeading2,
            headingOld: testData.updatedHeading1,
            sourceFileNew: testData.sourceFileName,
            sourceFileOld: testData.sourceFileName,
            lbTotal: 1,
            lbUpdated: 1,
            startedAt: today,
            startedByUserFirstName: testData.userProperties.firstName,
            startedByUserLastName: testData.userProperties.lastName,
          };

          MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);
          MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value1);
          cy.wait(2000);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          cy.wait(2000);
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value2);
          QuickMarcEditor.pressSaveAndClose({ acceptLinkedBibModal: true });

          MarcAuthorities.searchBy(testData.searchOption, marcFiles[2].authorityHeading);
          MarcAuthorities.selectTitle(marcFiles[2].authorityHeading);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();
          // Waiter needed for the whole page to be loaded.
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag111, testData.updatedTag111Value);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthorities.verifyHeadingsUpdatesDataViaAPI(today, tomorrow, expectedFirstUpdateData);
          MarcAuthorities.verifyHeadingsUpdatesDataViaAPI(
            today,
            tomorrow,
            expectedSecondUpdateData,
          );
          MarcAuthorities.verifyHeadingsUpdateExistsViaAPI(
            today,
            tomorrow,
            testData.updatedHeading3,
          );
          MarcAuthorities.verifyHeadingsUpdatesCountAndStructureViaAPI(today, tomorrow, '1');
          MarcAuthorities.verifyHeadingsUpdatesCountAndStructureViaAPI(today, tomorrow, '2');
        },
      );
    });
  });
});
