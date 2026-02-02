import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        tag100: '100',
        tag240: '240',
        linked240FieldValues: [
          17,
          '240',
          '1',
          '0',
          '$a C376594 Variations,',
          '',
          '$0 http://id.loc.gov/authorities/names/n83130832',
          '',
        ],
        authority100FieldValue: 'C376594 Variations,',
        marcBibTitle: 'Variations / Ludwig Van Beethoven.',
        updateLinkedFieldValues: [
          '$n test',
          '$f test',
          '$h test',
          '$k test',
          '$l test',
          '$m test',
          '$o test',
          '$p test',
          '$r test',
          '$s test',
          '$g test',
        ],
        inventoryInstanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        errorCalloutMessage:
          'A subfield(s) cannot be updated because it is controlled by an authority heading.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC376594.mrc',
          fileName: `testMarcFileC376594.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC376594.mrc',
          fileName: `testMarcFileC376594.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C376594 Variations,',
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C376594*');
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
          })
          .then(() => {});

        cy.waitForAuthRefresh(() => {
          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000)
          .then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag100,
              testData.authority100FieldValue,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.inventoryAll.gui,
            ]).then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
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
        'C376594 Add controllable subfields to linked "240" field of a "MARC bib" record (linked to "100" field of "MARC authority" record) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C376594'] },
        () => {
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
            InventorySearchAndFilter.verifyResultListExists();
          });
          InventorySearchAndFilter.executeSearch(createdRecordIDs[0]);
          InventoryInstance.waitLoading();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked240FieldValues);

          testData.updateLinkedFieldValues.forEach((fifthBoxValue, index) => {
            QuickMarcEditor.updateLinkedFifthBox(17, fifthBoxValue);
            // Need to wait until empty field is updated with the first value
            if (!index) cy.wait(500);
            testData.linked240FieldValues[5] = fifthBoxValue;
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked240FieldValues);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.checkErrorMessage(17, testData.errorCalloutMessage);
          });
        },
      );
    });
  });
});
