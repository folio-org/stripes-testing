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
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag001: '001',
        tag010: '010',
        tag240: '240',
        tag650: '650',
        tag240FifthBoxValue: '$m test',
        tag650FifthBoxValue: '$b 123',
        tag650SeventhBoxValue: '$b 123',
        errorMessage:
          'A subfield(s) cannot be updated because it is controlled by an authority heading.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileC375994.mrc',
          fileName: `testMarcFileC375994.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          instanceTitle:
            'C375994 Abraham Lincoln, by Lillian Hertz. Prize essay in Alexander Hamilton junior high school P.S. 186, June 24, 1927.',
        },
        {
          marc: 'marcAuthFileC375994_1.mrc',
          fileName: `testMarcFileC375994.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C375994 Robinson, Peter, 1950-2022 Alt. title',
          authority001FieldValue: '30520443759941',
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileC375994_2.mrc',
          fileName: `testMarcFileC375994.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'C375994 Speaking Oratory debating',
          authority010FieldValue: 'sh850952993759942',
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Import data, link records', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
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
          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000).then(() => {
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIconByIndex(10);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag001,
              marcFiles[1].authority001FieldValue,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIconByIndex(16);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[2].authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag010,
              `$a ${marcFiles[2].authority010FieldValue}`,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(16, testData.tag650);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIconByIndex(17);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[2].authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag010,
              `$a ${marcFiles[2].authority010FieldValue}`,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(17, testData.tag650);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C375994 Add controllable subfields to multiple linked fields in "MARC bib" record when deriving record (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire', 'C375994'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.fillLinkedFieldBox(10, 5, testData.tag240FifthBoxValue);
          QuickMarcEditor.fillLinkedFieldBox(16, 5, testData.tag650FifthBoxValue);
          QuickMarcEditor.fillLinkedFieldBox(17, 7, testData.tag650SeventhBoxValue);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(10, testData.errorMessage);
          QuickMarcEditor.checkErrorMessage(16, testData.errorMessage);
          QuickMarcEditor.checkErrorMessage(17, testData.errorMessage);
        },
      );
    });
  });
});
