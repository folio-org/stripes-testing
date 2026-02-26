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
  CLASSIFICATION_IDENTIFIER_TYPES,
} from '../../../../support/constants';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

const randomPostfix = getRandomPostfix();
const instanceTitlePrefix = 'AT_C468278_Instance';
const classificationPrefix = 'C468278';
const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[2].id; // LC
const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[2].algorithm;

const sharedCentralTypeName = `AT_C468278_ClassifType_Central_${randomPostfix}`;
const localMemberTypeName = `AT_C468278_ClassifType_Member_${randomPostfix}`;

const testClassifications = [
  {
    title: `${instanceTitlePrefix}_1`,
    type: 'Additional Dewey',
    value: `${classificationPrefix}598.100`,
    isMarc: false,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_2`,
    type: 'Canadian Classification',
    value: `${classificationPrefix}HT155`,
    isMarc: false,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_3`,
    type: 'Dewey',
    value: `${classificationPrefix}598.0995`,
    isMarc: true,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_4`,
    type: 'GDC',
    value: `${classificationPrefix}HEU/G74.3C50`,
    isMarc: true,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_5`,
    type: 'LC',
    value: `${classificationPrefix}QS 11 .GA1 E53 2006`,
    isMarc: true,
    expectExact: true,
  },
  {
    title: `${instanceTitlePrefix}_6`,
    type: 'LC (local)',
    value: `${classificationPrefix}DD259.4 .B527 1974`,
    isMarc: false,
    expectExact: true,
  },
  {
    title: `${instanceTitlePrefix}_7`,
    type: 'National Agricultural Library',
    value: `${classificationPrefix}HD3492.H9`,
    isMarc: false,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_8`,
    type: 'NLM',
    value: `${classificationPrefix}SB945.A6`,
    isMarc: true,
    expectExact: true,
  },
  {
    title: `${instanceTitlePrefix}_9`,
    type: 'SUDOC',
    value: `${classificationPrefix}L37.s:Oc1/2/992`,
    isMarc: false,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_10`,
    type: 'UDC',
    value: `${classificationPrefix}631.321:631.411.4`,
    isMarc: true,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_11`,
    type: sharedCentralTypeName,
    value: `${classificationPrefix}VP000322`,
    isMarc: false,
    expectExact: true,
  },
  {
    title: `${instanceTitlePrefix}_12`,
    type: localMemberTypeName,
    value: `${classificationPrefix}VP000323`,
    isMarc: false,
    expectExact: false,
  },
];

const marcFiles = [
  {
    marc: 'marcBibFileC468278.mrc',
    fileNameImported: `testMarcFileC468278.${getRandomPostfix()}.mrc`,
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
        cy.createTempUser(userPermissions).then((createdUser) => {
          user = createdUser;
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, userPermissions);
          // Create Shared identifier type on Central
          cy.resetTenant();
          ClassificationIdentifierTypesConsortiumManager.createViaApi({
            payload: { name: sharedCentralTypeName },
          }).then((sharedType) => {
            sharedCentralType = sharedType;
            // Create Local identifier type on Member
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
        cy.then(() => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          // Create Folio instances on Member
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
          // Import Marc instances on Member
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
          // Set LC browse option to LC, LC (local), NLM, Local (created on Central)
          cy.resetTenant();
          ClassificationIdentifierTypes.getIdByName(sharedCentralTypeName).then(
            (sharedCentralTypeId) => {
              ClassificationBrowse.updateIdentifierTypesAPI(
                classificationBrowseId,
                classificationBrowseAlgorithm,
                [
                  CLASSIFICATION_IDENTIFIER_TYPES.LC,
                  CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
                  CLASSIFICATION_IDENTIFIER_TYPES.NLM,
                  sharedCentralTypeId,
                ],
              );
            },
          );
        });
      });

      after('Delete user, identifier types, instances', () => {
        cy.resetTenant();
        cy.getAdminToken();
        ClassificationBrowse.updateIdentifierTypesAPI(
          classificationBrowseId,
          classificationBrowseAlgorithm,
          [],
        );
        ClassificationIdentifierTypesConsortiumManager.deleteViaApi(sharedCentralType);
        cy.setTenant(Affiliations.College);
        ClassificationIdentifierTypes.deleteViaApi(localMemberTypeId);
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C468278 Classifications of each identifier type from Local Instances could be found in the browse result list by "Library of Congress classification" option when LC, LC (local), NLM and local (shared) are selected in settings, from Member tenant only (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C468278'] },
        () => {
          cy.resetTenant();
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventoryInstances.waitContentLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
          cy.setTenant(Affiliations.College);
          testClassifications.forEach((row) => {
            InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
              BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
            );
            if (row.expectExact) {
              BrowseClassifications.waitForClassificationNumberToAppear(
                row.value,
                classificationBrowseId,
              );
            }
            InventorySearchAndFilter.browseSearch(row.value);
            if (row.expectExact) {
              BrowseClassifications.verifySearchResultsTable();
              BrowseClassifications.verifyValueInResultTableIsHighlighted(row.value);
            } else {
              BrowseCallNumber.checkNonExactSearchResult(row.value);
            }
            InventorySearchAndFilter.clickResetAllButton();
            BrowseClassifications.verifySearchResultsTable(false);
          });
          // Check the second exact match and click on it
          const secondExact = testClassifications.filter((tc) => tc.expectExact)[1];
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
          );
          InventorySearchAndFilter.browseSearch(secondExact.value);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(secondExact.value);
          InventorySearchAndFilter.selectFoundItemFromBrowse(secondExact.value);
          InventorySearchAndFilter.verifySearchOptionAndQuery(
            'Query',
            `classifications.classificationNumber=="${secondExact.value}"`,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.switchToBrowseTab();
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(secondExact.value);

          // Switch to Central tenant and verify all searches show non-exact match placeholder
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
          testClassifications.forEach((row) => {
            InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
              BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
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
