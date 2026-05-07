import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const testData = {
        browseSearchOption: 'personalNameTitle',
        tag100: '100',
        tag100RowIndex: 15,
        authority100FieldValue: 'C656333 Kerouac, Jack, 1922-1969',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC656333.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC656333.mrc',
          fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getAdminUserDetails().then((admin) => {
          testData.adminUser = admin;
        });
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C656333');
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
        cy.then(() => {
          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();

          InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          MarcAuthorities.checkSearchOption(testData.browseSearchOption);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(testData.authority100FieldValue);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthority('100');
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          cy.logout();
        });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [
              CapabilitySets.uiInventory,
              CapabilitySets.uiQuickMarcQuickMarcEditor,
              CapabilitySets.uiQuickMarcQuickMarcAuthorityRecordsLinkUnlink,
            ],
          );

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C656333 Check "Version history" after linking MARC authority record to Instance (folijet)',
        { tags: ['extendedPath', 'folijet', 'C656333'] },
        () => {
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(2);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.adminUser.personal.firstName,
            lastName: testData.adminUser.personal.lastName,
            changes: ['Contributors (Added)', 'Contributors (Removed)'],
          });
          VersionHistorySection.clickCloseButton();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.clickUnlinkIconInTagField(testData.tag100RowIndex);
          QuickMarcEditor.checkUnlinkModal(testData.tag100);
          QuickMarcEditor.confirmUnlinkingField();
          QuickMarcEditor.checkLinkButtonExist(testData.tag100);
          QuickMarcEditor.pressSaveAndClose();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(3);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            changes: ['Contributors (Added)', 'Contributors (Removed)'],
          });
        },
      );
    });
  });
});
