import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        tag010: '010',
        tag100: '100',
        tag240: '240',
        authority001FieldValue: '4284518',
        authority100FieldValue: 'C375139 Beethoven, Ludwig van (no 010)',
        searchOption: 'Keyword',
        fieldForEditing: { tag: '380', newValue: '$a Variations TEST $2 lcsh' },
        calloutMessage: 'Record cannot be saved with more than one 010 field',
      };

      const createdRecordIDs = [];

      const marcFiles = [
        {
          marc: 'marcBibFileForC375139.mrc',
          fileName: `testMarcFileC375139.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          instanceTitle: 'Variations / C375139Ludwig Van Beethoven.',
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC375139.mrc',
          fileName: `testMarcFileC375139.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C375139 Beethoven, Ludwig van (no 010)',
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];

      before('Create test data', () => {
        // make sure there are no duplicate records in the system
        cy.getAdminToken();
        MarcAuthorities.getMarcAuthoritiesViaApi({ limit: 100, query: 'keyword="C375139"' }).then(
          (records) => {
            records.forEach((record) => {
              if (record.authRefType === 'Authorized') {
                MarcAuthority.deleteViaAPI(record.id, true);
              }
            });
          },
        );

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

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.loginAsAdmin();
          cy.visit(TopMenu.inventoryPath).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(testData.authority100FieldValue);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag100,
              `$a ${testData.authority100FieldValue}`,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C375139 Edit any field in linked "MARC authority" record without "010" field when "001" = "$0" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchAndVerify(testData.searchOption, marcFiles[1].authorityHeading);
          MarcAuthorities.verifyMarcViewPaneIsOpened();

          MarcAuthority.edit();
          cy.wait(2000);
          QuickMarcEditor.checkFieldAbsense(testData.tag010);

          QuickMarcEditor.updateExistingField(
            testData.fieldForEditing.tag,
            testData.fieldForEditing.newValue,
          );
          QuickMarcEditor.checkContent(testData.fieldForEditing.newValue, 7);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthorities.checkFieldAndContentExistence(
            testData.fieldForEditing.tag,
            testData.fieldForEditing.newValue,
          );

          TopMenuNavigation.navigateToApp('Inventory');

          InventoryInstances.searchAndVerify(marcFiles[0].instanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.waitInstanceRecordViewOpened(marcFiles[0].instanceTitle);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            18,
            '240',
            '1',
            '0',
            '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
            '',
            `$0 ${testData.authority001FieldValue}`,
            '',
          );
        },
      );
    });
  });
});
