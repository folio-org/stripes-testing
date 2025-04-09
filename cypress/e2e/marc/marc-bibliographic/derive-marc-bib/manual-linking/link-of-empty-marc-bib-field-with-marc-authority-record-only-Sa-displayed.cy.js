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
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        let userData = {};
        const testData = {
          tag700: '700',
          rowIndex: 79,
          newContent: '$a',
          createdRecordsIDs: [],
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC380758.mrc',
            fileName: `testMarcFileC380758${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC380758.mrc',
            fileName: `testMarcFileC380758${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            authorityHeading: 'C380758 Lee, Stan, 1922-2018',
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const bib700AfterLinkingToAuth100 = [
          testData.rowIndex,
          testData.tag700,
          '1',
          '\\',
          '$a C380758 Lee, Stan, $d 1922-2018',
          '',
          '$0 http://id.loc.gov/authorities/names/n83169267',
          '',
        ];

        const bib700AfterUnLinkingToAuth100 = [testData.rowIndex, testData.tag700, '1', '\\', '$a'];

        before('Creating user and test data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380758*');

          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  testData.createdRecordsIDs.push(record[marcFile.propertyName].id);
                });
              });
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordsIDs[0]);
          MarcAuthority.deleteViaAPI(testData.createdRecordsIDs[1]);
        });

        it(
          'C380758 Derive | Link of empty MARC Bib field with "MARC Authority" record (only $a is displayed) (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C380758'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBib();
            QuickMarcEditor.updateExistingFieldContent(testData.rowIndex, testData.newContent);
            QuickMarcEditor.clickLinkIconInTagField(testData.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag700, testData.rowIndex);
            QuickMarcEditor.checkUnlinkTooltipText(
              testData.rowIndex,
              'Unlink from MARC Authority record',
            );
            QuickMarcEditor.checkViewMarcAuthorityTooltipText(testData.rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
            QuickMarcEditor.clickUnlinkIconInTagField(testData.rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib700AfterUnLinkingToAuth100);
            QuickMarcEditor.verifyTagFieldNotLinked(...bib700AfterUnLinkingToAuth100);
          },
        );
      });
    });
  });
});
