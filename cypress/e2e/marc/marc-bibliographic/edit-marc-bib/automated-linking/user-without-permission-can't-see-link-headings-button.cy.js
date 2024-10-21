import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tag700: '700',
          tag700RowIndex: 25,
          tag700Content: '$a Dugmore, C. W. $q (Clifford William), $e ed. $0 id001',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC387521.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
        ];

        const createdRecordsIDs = [];

        before('Creating user and data', () => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.userPropertiesC387521 = createdUserProperties;
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          ]).then((createdUserProperties) => {
            testData.userPropertiesC387523 = createdUserProperties;
          });

          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordsIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userPropertiesC387521.userId);
          Users.deleteViaApi(testData.userPropertiesC387523.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
        });

        it(
          'C387521 User without permission "quickMARC: Can Link/unlink authority records to bib records" cant see "Link headings" button when edit "MARC bib" (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C387521'] },
          () => {
            cy.login(
              testData.userPropertiesC387521.username,
              testData.userPropertiesC387521.password,
              {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              },
            );

            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(testData.tag700, testData.tag700Content);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(
              testData.tag700RowIndex,
              testData.tag700,
              '1',
              '\\',
              `${testData.tag700Content}`,
            );
            QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
          },
        );

        it(
          'C387523 User without permission "quickMARC: Can Link/unlink authority records to bib records" cant see "Link headings" button when derive "MARC bib" (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C387523'] },
          () => {
            cy.login(
              testData.userPropertiesC387523.username,
              testData.userPropertiesC387523.password,
              {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              },
            );

            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(testData.tag700, testData.tag700Content);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(
              testData.tag700RowIndex,
              testData.tag700,
              '1',
              '\\',
              `${testData.tag700Content}`,
            );
            QuickMarcEditor.checkAbsenceOfLinkHeadingsButton();
          },
        );
      });
    });
  });
});
