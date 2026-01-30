import {
  DEFAULT_JOB_PROFILE_NAMES,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const testData = {
  user: {},
  instanceIDs: [],
  authorityIDs: [],
  tag: '111',
  marcValue: 'Mediterranean Conference on Medical and Biological Engineering',
  instanceTitle:
    'Mediterranean conference on medical and biological engineering and computing 2013 / Laura M. Roa Romero, editor.',
  authorizedTypes: {
    AUTHORIZED: 'Authorized',
  },
};

const marcFiles = [
  {
    marc: 'marcBibC375263.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numOfRecords: 1,
    propertyName: 'instance',
  },
  {
    marc: 'marcAuthC375263.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
    numOfRecords: 1,
    propertyName: 'authority',
  },
];
describe('MARC', () => {
  describe('MARC Authority', () => {
    before('Creating user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.marcValue);

      marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            if (marcFile.jobProfileToRun === DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS) {
              testData.instanceIDs.push(record[marcFile.propertyName].id);
            } else {
              testData.authorityIDs.push(record[marcFile.propertyName].id);
            }
          });
        });
      });

      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
        authRefresh: true,
      }).then(() => {
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(testData.marcValue);
        cy.ifConsortia(true, () => {
          MarcAuthorities.clickAccordionByName('Shared');
          MarcAuthorities.actionsSelectCheckbox('No');
        });
        MarcAuthoritiesSearch.selectExcludeReferencesFilter();
        MarcAuthoritiesSearch.selectExcludeReferencesFilter(
          REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
        );
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ])
        .then((createdUserProperties) => {
          testData.user = createdUserProperties;
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      testData.authorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C375263 "Number of titles" link in "MARC authority" app opens linked "MARC bib" record with controlled "111" field (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C375263'] },
      () => {
        // Step 1: Input query in search input field that will return imported "MARC authority" record → Click "Search"
        MarcAuthorities.searchBy('Keyword', testData.marcValue);
        cy.ifConsortia(true, () => {
          MarcAuthorities.clickAccordionByName('Shared');
          MarcAuthorities.actionsSelectCheckbox('No');
        });
        MarcAuthoritiesSearch.selectExcludeReferencesFilter(
          REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
        );
        MarcAuthorities.checkAfterSearch(testData.authorizedTypes.AUTHORIZED, testData.marcValue);
        MarcAuthorities.verifyNumberOfTitles(5, '1');

        // Step 2: Click a number in "Number of titles" column for "Authorized" row
        MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle);
        InventoryInstance.checkInstanceTitle(testData.instanceTitle);
      },
    );
  });
});
