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
  tag: '600',
  marcValue: 'Clovio, Giulio, 1498-1578',
  instanceTitle:
    'Farnese book of hours : MS M.69 of the Pierpont Morgan Library New York / commentary, William M. Voelkle, Ivan Golub.',
  authorizedTypes: {
    AUTHORIZED: 'Authorized',
  },
};

const marcFiles = [
  {
    marc: 'marcBibC374164.mrc',
    fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numOfRecords: 1,
    propertyName: 'instance',
  },
  {
    marc: 'marcAuthC374164.mrc',
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
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: `title="${testData.instanceTitle}"`,
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });
      MarcAuthorities.getMarcAuthoritiesViaApi({
        limit: 100,
        query: `keyword="${testData.marcValue}" and (authRefType==("Authorized" or "Auth/Ref"))`,
      }).then((authorities) => {
        if (authorities) {
          authorities.forEach(({ id }) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
        }
      });

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

      cy.waitForAuthRefresh(() => {
        cy.loginAsAdmin();
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.waitContentLoading();
      }, 20_000).then(() => {
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
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      testData.authorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C374164 "Number of titles" link in "MARC authority" app opens linked "MARC bib" record with controlled "600" field (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C374164'] },
      () => {
        // Step 1: Input query in search input field that will return imported "MARC authority" record → Click "Search"
        MarcAuthorities.searchBy('Keyword', testData.marcValue);
        cy.ifConsortia(true, () => {
          MarcAuthorities.clickAccordionByName('Shared');
          MarcAuthorities.actionsSelectCheckbox('No');
        });
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
