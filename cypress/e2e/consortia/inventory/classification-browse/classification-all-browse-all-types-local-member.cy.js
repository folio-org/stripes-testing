import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseClassifications from '../../../../support/fragments/inventory/search/browseClassifications';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';
import ClassificationIdentifierTypes from '../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import ClassificationIdentifierTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import {
  BROWSE_CLASSIFICATION_OPTIONS,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';

const randomPostfix = getRandomPostfix();
const instanceTitlePrefix = 'AT_C468274_Instance';
const classificationPrefix = 'C468274';
const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[0].id; // 'all'
const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[0].algorithm;

// Classification identifier types
const localCentralTypeName = `AT_C468274_ClassifType_${randomPostfix}`;
const localMemberTypeName = `AT_C468274_ClassifType${randomPostfix}`;

// Classification values and types for each instance
const testClassifications = [
  {
    title: `${instanceTitlePrefix}_1`,
    type: 'Additional Dewey',
    value: `${classificationPrefix}598.100`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_2`,
    type: 'Canadian Classification',
    value: `${classificationPrefix}HT155`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_3`,
    type: 'Dewey',
    value: `${classificationPrefix}598.0995`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_4`,
    type: 'GDC',
    value: `${classificationPrefix}HEU/G74.3C50`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_5`,
    type: 'LC',
    value: `${classificationPrefix}QS 11 .GA1 E53 2006`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_6`,
    type: 'LC (local)',
    value: `${classificationPrefix}DD259.4 .B527 1974`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_7`,
    type: 'National Agricultural Library',
    value: `${classificationPrefix}HD3492.H9`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_8`,
    type: 'NLM',
    value: `${classificationPrefix}SB945.A6`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_9`,
    type: 'SUDOC',
    value: `${classificationPrefix}L37.s:Oc1/2/992`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_10`,
    type: 'UDC',
    value: `${classificationPrefix}631.321:631.411.4`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_11`,
    type: localCentralTypeName,
    value: `${classificationPrefix}VP000322`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_12`,
    type: localMemberTypeName,
    value: `${classificationPrefix}VP000323`,
    isMarc: false,
  },
];

const marcFiles = [
  {
    marc: 'marcBibFileC468274.mrc',
    fileNameImported: `testMarcFileC468274.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
  },
];

const userPermissions = [Permissions.uiInventoryViewInstances.gui];

let user;
let sharedCentralType;
let localMemberTypeId;
const createdInstanceIds = [];

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    describe('Consortia', () => {
      before('Create user, identifier types', () => {
        cy.resetTenant();
        cy.getAdminToken();
        // Create user with permissions and affiliations for all tenants
        cy.createTempUser(userPermissions).then((createdUser) => {
          user = createdUser;
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.assignAffiliationToUser(Affiliations.University, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, userPermissions);
          cy.wait(10_000);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(user.userId, userPermissions);
          // Create Shared identifier type on Central
          cy.resetTenant();
          cy.getAdminToken();
          ClassificationIdentifierTypesConsortiumManager.createViaApi({
            payload: {
              name: localCentralTypeName,
            },
          }).then((sharedType) => {
            sharedCentralType = sharedType;
            // Create Local identifier type on Member 1
            cy.setTenant(Affiliations.College);
            ClassificationIdentifierTypes.createViaApi({
              name: localMemberTypeName,
              source: 'local',
            }).then((responseCollege) => {
              localMemberTypeId = responseCollege.body.id;
            });

            // Delete existing instances for this test
            InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
          });
        });
      });

      before('Create instances', () => {
        // Create Folio instances on Member 1
        cy.then(() => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((types) => {
            const instanceTypeId = types[0].id;
            testClassifications
              .filter((entry) => !entry.isMarc)
              .forEach((row) => {
                ClassificationIdentifierTypes.getIdByName(row.type).then((typeId) => {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: row.title,
                      classifications: [
                        {
                          classificationTypeId: typeId,
                          classificationNumber: row.value,
                        },
                      ],
                    },
                  }).then((instance) => {
                    createdInstanceIds.push(instance.instanceId);
                  });
                });
              });
          });
          // Import Marc instances on Member 1
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileNameImported,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdInstanceIds.push(record.instance.id);
              });
            });
          });
        }).then(() => {
          // Ensure Classification (all) browse option has no selected identifier types
          cy.resetTenant();
          ClassificationBrowse.updateIdentifierTypesAPI(
            classificationBrowseId,
            classificationBrowseAlgorithm,
            [],
          );
        });
      });

      after('Delete user, identifier types, instances', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ClassificationIdentifierTypesConsortiumManager.deleteViaApi(sharedCentralType);
        cy.setTenant(Affiliations.College);
        ClassificationIdentifierTypes.deleteViaApi(localMemberTypeId);
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C468274 Classifications of each identifier type from Local Instances could be found in the browse result list by "Classification (all)" option when settings are empty, from Member tenant only (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C468274'] },
        () => {
          // Steps 1-11: On Member 1, all classifications should be found as exact matches
          cy.waitForAuthRefresh(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }, 20_000);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventorySearchAndFilter.switchToBrowseTab();
          cy.setTenant(Affiliations.College);
          testClassifications.slice(0, -1).forEach((row) => {
            BrowseClassifications.waitForClassificationNumberToAppear(row.value);
            InventorySearchAndFilter.selectBrowseOption(
              BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
            );
            InventorySearchAndFilter.browseSearch(row.value);
            BrowseClassifications.verifySearchResultsTable();
            BrowseClassifications.verifyValueInResultTableIsHighlighted(row.value);
            InventorySearchAndFilter.clickResetAllButton();
            BrowseClassifications.verifySearchResultsTable(false);
          });
          // Check the last classification value and click on it
          BrowseClassifications.waitForClassificationNumberToAppear(testClassifications[11].value);
          InventorySearchAndFilter.selectBrowseOption(
            BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.browseSearch(testClassifications[11].value);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(
            testClassifications[11].value,
          );
          InventorySearchAndFilter.selectFoundItemFromBrowse(testClassifications[11].value);
          InventorySearchAndFilter.verifySearchOptionAndQuery(
            'Query search',
            `classifications.classificationNumber=="${testClassifications[11].value}"`,
          );
          // Number of found Instance records matches to the value in "Number of titles" column from the Browse result list for selected Classification
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          // Return to browse
          InventorySearchAndFilter.switchToBrowseTab();
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(
            testClassifications[11].value,
          );

          // Step 15-17: On Central, non-exact match placeholder is displayed
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          InventorySearchAndFilter.switchToBrowseTab();
          testClassifications.forEach((row) => {
            InventorySearchAndFilter.selectBrowseOption(
              BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
            );
            InventorySearchAndFilter.browseSearch(row.value);
            BrowseCallNumber.checkNonExactSearchResult(row.value);
            InventorySearchAndFilter.clickResetAllButton();
            BrowseClassifications.verifySearchResultsTable(false);
          });

          // Step 18-20: On Member 2, non-exact match placeholder is displayed
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventorySearchAndFilter.switchToBrowseTab();
          testClassifications.forEach((row) => {
            InventorySearchAndFilter.selectBrowseOption(
              BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
            );
            InventorySearchAndFilter.browseSearch(row.value);
            BrowseCallNumber.checkNonExactSearchResult(row.value);
            InventorySearchAndFilter.clickResetAllButton();
            BrowseClassifications.verifySearchResultsTable(false);
          });
        },
      );
    });
  });
});
