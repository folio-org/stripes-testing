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
  marcValue: 'C380530 Beethoven, Ludwig van,',
  tag100: '100',
  tag240: '240',
  title:
    'Beethoven, Ludwig the Greatest $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
  updatedTag100Value1:
    '$a C380530 Beethoven, Ludwig the Greatest $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
  updatedTag100Value2:
    '$a C380530 Beethoven, Ludwig the Loudest $d 1770-1827. $t Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
  searchOption: 'Keyword',
  sourceFileName: 'LC Name Authority file (LCNAF)',
};

const twoPreviousDay = DateTools.getTwoPreviousDaysDateForFiscalYear();

const marcFiles = [
  {
    marc: 'marcBibFileForC380530.mrc',
    fileName: `testMarcFileC380530.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    propertyName: 'instance',
  },
  {
    marc: 'marcAuthFileForC380530_1.mrc',
    fileName: `testMarcFileC380530.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    propertyName: 'authority',
    authorityHeading:
      'C380530 Beethoven, Ludwig van, 1770-1827. Variations, piano, violin, cello, op. 44, E♭ major',
    authority010FieldValue: '831308323805301',
  },
  {
    marc: 'marcAuthFileForC380530_2.mrc',
    fileName: `testMarcFileC380530.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    propertyName: 'authority',
    authorityHeading:
      'C380530 Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
    authority010FieldValue: 'n847454253805302',
  },
];

const createdRecordIDs = [];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      before('Creating user and uploading files', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
          .then((userProperties) => {
            testData.preconditionUserId = userProperties.userId;

            // make sure there are no duplicate authority records in the system
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380530');

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
              cy.wait(2000);
            });
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.loginAsAdmin();
              cy.visit(TopMenu.inventoryPath);
              InventoryInstances.waitContentLoading();
            }, 20_000);
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
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
          });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
      });

      after('Deleting user and data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        Users.deleteViaApi(testData.userProperties.userId);
        Users.deleteViaApi(testData.preconditionUserId);
      });

      it(
        'C380530 No data for "MARC authority headings updates (CSV)" report gathered for time range when no header updates were made to "MARC authority" records (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380530'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);
          MarcAuthoritiesSearch.selectAuthorityByIndex(0);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value1);
          QuickMarcEditor.saveAndKeepEditingUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);

          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag100, testData.updatedTag100Value2);
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);

          MarcAuthorities.verifyNoHeadingsUpdatesDataViaAPI(twoPreviousDay, twoPreviousDay);
        },
      );
    });
  });
});
