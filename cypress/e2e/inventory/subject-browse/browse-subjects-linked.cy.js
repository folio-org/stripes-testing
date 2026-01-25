import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      tag010: '010',
      tag610: '610',
      rowIndex: 20,
      subjectName: 'C375163 SuperCorp',
      instanceTitle: 'C375163 Testfire : a litany for survival',
    };

    const marcFiles = [
      {
        marc: 'marcBibC375163.mrc',
        fileName: `testMarcFileC375163.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthC375163.mrc',
        fileName: `testMarcFileC375163.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        naturalId: 'gf201402375163',
        propertyName: 'authority',
      },
    ];

    const createdRecordIDs = [];

    before('Creating data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375163*');
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
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
          authRefresh: true,
        }).then(() => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIconByIndex(testData.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.searchResults(testData.subjectName);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag010,
            `$a ${marcFiles[1].naturalId}`,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(testData.rowIndex, testData.tag610);
          QuickMarcEditor.saveAndCloseWithValidationWarnings();
        });
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('Deleting created user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C375163 Browse | Separate entries for "Subjects" from linked and unlinked "6XX" fields of "MARC bib" record (same subject names) (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C375163'] },
      () => {
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        BrowseSubjects.select();
        BrowseSubjects.waitForSubjectToAppear(testData.subjectName, true, true);
        BrowseSubjects.browse(testData.subjectName);
        BrowseSubjects.checkRowWithValueAndAuthorityIconExists(testData.subjectName);
        BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(testData.subjectName);
        BrowseSubjects.checkRowValueIsBold(5, testData.subjectName);
        BrowseSubjects.checkRowValueIsBold(6, testData.subjectName);
        InventorySearchAndFilter.switchToSearchTab();
        InventoryInstances.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.clickUnlinkIconInTagField(20);
        QuickMarcEditor.confirmUnlinkingField();
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        BrowseSubjects.waitForSubjectToAppear(testData.subjectName, true, false);
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.select();
        BrowseSubjects.browse(testData.subjectName);
        BrowseSubjects.checkNoAuthorityIconDisplayedForRow(5, testData.subjectName);
        BrowseSubjects.checkRowValueIsBold(5, testData.subjectName);
        BrowseSubjects.checkValueAbsentInRow(6, testData.subjectName);
      },
    );
  });
});
