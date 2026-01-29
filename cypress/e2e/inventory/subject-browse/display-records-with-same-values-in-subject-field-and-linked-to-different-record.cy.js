import { including } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

const testData = {
  user: {},
  recordIDs: [],
  tags: ['650'],
  instanceRecords: [
    "Black Panther / writer, Ta-Nehisi Coates ; artist, Brian Stelfreeze ; pencils/layouts, Chris Sprouse ; color artist, Laura Martin ; letterer, VC's Joe Sabino.",
    'Black Panther : the Intergalactic Empire of Wakanda',
  ],
  searchAuthorityQueries: ['Good and evil'],
  browseQueries: ['Good and Evil'],
  subjectHeading: ['Good and evil'],

  marcFiles: [
    {
      marc: 'marcBibC375224.mrc',
      fileName: `testMarcFileC375224.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      numberOfRecords: 2,
      propertyName: 'instance',
    },
    {
      marc: 'marcAuth_1C375224.mrc',
      fileName: `testMarcFileAuth_1C375224.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
      propertyName: 'authority',
    },
    {
      marc: 'marcAuth_2C375224.mrc',
      fileName: `testMarcFileAuth_2C375224.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
      propertyName: 'authority',
    },
  ],
};

describe('Inventory', () => {
  describe('Subject Browse', () => {
    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: 'title="Black Panther"',
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
            testData.searchAuthorityQueries.forEach((query) => {
              MarcAuthorities.getMarcAuthoritiesViaApi({
                limit: 100,
                query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
              }).then((authorities) => {
                if (authorities) {
                  authorities.forEach(({ id }) => {
                    MarcAuthority.deleteViaAPI(id, true);
                  });
                }
              });
            });
          });
          testData.marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.recordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });
        })
        .then(() => {
          cy.waitForAuthRefresh(() => {
            cy.loginAsAdmin();
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
          }, 20_000);
          for (let i = 0; i < testData.instanceRecords.length; i++) {
            cy.ifConsortia(true, () => {
              InventorySearchAndFilter.byShared('No');
            });
            InventoryInstances.searchByTitle(testData.recordIDs[i]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tags[0]);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(testData.searchAuthorityQueries[0]);
            cy.ifConsortia(true, () => {
              MarcAuthorities.clickAccordionByName('Shared');
              MarcAuthorities.actionsSelectCheckbox('No');
            });
            MarcAuthoritiesSearch.selectExcludeReferencesFilter();
            MarcAuthoritiesSearch.selectAuthorityByIndex(i);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tags[0]);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.verifySubjectHeading(including(testData.subjectHeading[0]));
            InventoryInstances.resetAllFilters();
          }
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;
          });
          cy.logout();
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.recordIDs[0]);
      InventoryInstance.deleteInstanceViaApi(testData.recordIDs[1]);
      MarcAuthority.deleteViaAPI(testData.recordIDs[2]);
      MarcAuthority.deleteViaAPI(testData.recordIDs[3]);
    });

    it(
      'C375224 Browse | Display records with same values in "Subject" field and linked to different "MARC authority" records (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C375224'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        }, 20_000);

        InventorySearchAndFilter.selectBrowseSubjects();
        BrowseSubjects.waitForSubjectToAppear(testData.searchAuthorityQueries[0], true, true);
        InventorySearchAndFilter.browseSearch(testData.browseQueries[0]);
        BrowseSubjects.checkAuthorityIconAndValueDisplayedForRow(
          5,
          testData.searchAuthorityQueries[0],
        );
        BrowseSubjects.checkAuthorityIconAndValueDisplayedForRow(
          6,
          testData.searchAuthorityQueries[0],
        );
        BrowseSubjects.verifyNumberOfTitlesForRow(5, 1);
        BrowseSubjects.verifyNumberOfTitlesForRow(6, 1);
      },
    );
  });
});
