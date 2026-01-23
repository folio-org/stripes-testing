import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  marcValue: 'C380531 Beethoven, Ludwig van,',
  tag100: '100',
  tag240: '240',
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
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    propertyName: 'instance',
  },
  {
    marc: 'marcAuthFileForC380531.mrc',
    fileName: `testMarcFileC380531.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    propertyName: 'authority',
    authorityHeading:
      'C380531 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
    authority010FieldValue: 'n83130007380531',
  },
];

const createdRecordIDs = [];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      before('Creating user and uploading files', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380531*');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          marcFiles.forEach((marcFile) => {
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

          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
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
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag240, 17);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
          });
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Deleting user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C380531 Data for "MARC authority headings updates (CSV)" report is generated for controlling record with updated heading ("$0"="001") (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380531'] },
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
          cy.wait(3000);

          MarcAuthorities.verifyHeadingsUpdatesDataViaAPI(today, tomorrow, expectedFirstUpdateData);
        },
      );
    });
  });
});
