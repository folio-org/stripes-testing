import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          searchOption: 'Personal name',
          marcValue: 'C380755 Lee, Stan, 1922-2018',
          markedValue: 'C380755 Lee, Stan,',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC380755.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC380755.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before('Creating user and records', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380755*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record[marcFile.propertyName].id);
                });
              });
            });

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });

        after('Deleting created user and records', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
          MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
        });

        it(
          'C380755 Link of empty MARC Bib field with "MARC Authority" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C380755'] },
          () => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            QuickMarcEditor.checkLinkButtonExistByRowIndex(79);
            QuickMarcEditor.updateExistingFieldContent(79, '');
            QuickMarcEditor.clickLinkIconInTagField(79);

            MarcAuthorities.switchToBrowse();
            MarcAuthorities.checkDefaultBrowseOptions();
            MarcAuthorities.searchByParameter(testData.searchOption, testData.marcValue);
            MarcAuthorities.selectTitle(testData.marcValue);
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
            InventoryInstance.clickLinkButton();

            QuickMarcEditor.verifyAfterLinkingUsingRowIndex('700', 79);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(79);
            QuickMarcEditor.verifyTagFieldAfterLinking(
              79,
              '700',
              '1',
              '\\',
              '$a C380755 Lee, Stan, $d 1922-2018',
              '',
              '$0 http://id.loc.gov/authorities/names/n83169267',
              '',
            );
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane('Contributor');
          },
        );
      });
    });
  });
});
