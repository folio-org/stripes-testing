import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import Affiliations from '../../../../support/dictionary/affiliations';
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

const randomPostfix = getRandomPostfix();
const instanceTitlePrefix = 'AT_C468273_Instance';
const classificationPrefix = 'C468273';
const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[0].id; // 'all'
const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[0].algorithm;

// Classification identifier types
const localSharedTypeName = `AT_C468273_ClassifType_${randomPostfix}`;

// Classification values and types for each instance
const testClassifications = [
  {
    title: `${instanceTitlePrefix}_1`,
    type: 'Additional Dewey',
    value: `${classificationPrefix}598.099`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_2`,
    type: 'Canadian Classification',
    value: `${classificationPrefix}HT154`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_3`,
    type: 'Dewey',
    value: `${classificationPrefix}598.0994`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_4`,
    type: 'GDC',
    value: `${classificationPrefix}HEU/G74.3C49`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_5`,
    type: 'LC',
    value: `${classificationPrefix}QS 11 .GA1 E53 2005`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_6`,
    type: 'LC (local)',
    value: `${classificationPrefix}DD259.4 .B527 1973`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_7`,
    type: 'National Agricultural Library',
    value: `${classificationPrefix}HD3492.H8`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_8`,
    type: 'NLM',
    value: `${classificationPrefix}SB945.A5`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_9`,
    type: 'SUDOC',
    value: `${classificationPrefix}L37.s:Oc1/2/991`,
    isMarc: false,
  },
  {
    title: `${instanceTitlePrefix}_10`,
    type: 'UDC',
    value: `${classificationPrefix}631.321:631.411.3`,
    isMarc: true,
  },
  {
    title: `${instanceTitlePrefix}_11`,
    type: localSharedTypeName,
    value: `${classificationPrefix}VP000321`,
    isMarc: false,
  },
];

const marcFiles = [
  {
    marc: 'marcBibFileC468273.mrc',
    fileNameImported: `testMarcFileC468273.${getRandomPostfix()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
  },
];

const userPermissions = [Permissions.uiInventoryViewInstances.gui];

let user;
let sharedType;
const createdInstanceIds = [];

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    describe('Consortia', () => {
      before('Create user, identifier types, instances', () => {
        cy.resetTenant();
        cy.getAdminToken();
        // Delete existing instances for this test
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        cy.createTempUser(userPermissions).then((createdUser) => {
          user = createdUser;
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, userPermissions);
          // Create Shared identifier type on Central
          cy.resetTenant();
          ClassificationIdentifierTypesConsortiumManager.createViaApi({
            payload: { name: localSharedTypeName },
          }).then((shared) => {
            sharedType = shared;
            // Create Folio instances on Central
            cy.getAdminToken();
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
            // Import Marc instances on Central
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
            // Ensure Classification (all) browse option has no selected identifier types
            cy.resetTenant();
            ClassificationBrowse.updateIdentifierTypesAPI(
              classificationBrowseId,
              classificationBrowseAlgorithm,
              [],
            );
          });
        });
      });

      after('Delete user, identifier types, instances', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ClassificationIdentifierTypesConsortiumManager.deleteViaApi(sharedType);
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C468273 Classifications of each identifier type from Shared Instances could be found in the browse result list by "Classification (all)" option when settings are empty, from Member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C468273'] },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.resetTenant();
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }, 20_000);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
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
          BrowseClassifications.waitForClassificationNumberToAppear(testClassifications[10].value);
          InventorySearchAndFilter.selectBrowseOption(
            BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.browseSearch(testClassifications[10].value);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(
            testClassifications[10].value,
          );
          InventorySearchAndFilter.selectFoundItemFromBrowse(testClassifications[10].value);
          InventorySearchAndFilter.verifySearchOptionAndQuery(
            'Query search',
            `classifications.classificationNumber=="${testClassifications[10].value}"`,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.switchToBrowseTab();
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(
            testClassifications[10].value,
          );
        },
      );
    });
  });
});
