import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
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

const randomPostfix = getRandomPostfix();
const instanceTitlePrefix = 'AT_C468276_Instance';
const classificationPrefix = 'C468276';
const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[2].id; // LC
const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[2].algorithm;

const sharedCentralTypeName = `AT_C468276_ClassifType_Central_${randomPostfix}`;

const testClassifications = [
  {
    title: `${instanceTitlePrefix}_1`,
    type: 'Additional Dewey',
    value: `${classificationPrefix}598.099`,
    isMarc: false,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_2`,
    type: 'Canadian Classification',
    value: `${classificationPrefix}HT154`,
    isMarc: false,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_3`,
    type: 'Dewey',
    value: `${classificationPrefix}598.0994`,
    isMarc: true,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_4`,
    type: 'GDC',
    value: `${classificationPrefix}HEU/G74.3C49`,
    isMarc: true,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_5`,
    type: 'LC',
    value: `${classificationPrefix}QS 11 .GA1 E53 2005`,
    isMarc: true,
    expectExact: true,
  },
  {
    title: `${instanceTitlePrefix}_6`,
    type: 'LC (local)',
    value: `${classificationPrefix}DD259.4 .B527 1973`,
    isMarc: false,
    expectExact: true,
  },
  {
    title: `${instanceTitlePrefix}_7`,
    type: 'National Agricultural Library',
    value: `${classificationPrefix}HD3492.H8`,
    isMarc: false,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_8`,
    type: 'NLM',
    value: `${classificationPrefix}SB945.A5`,
    isMarc: true,
    expectExact: true,
  },
  {
    title: `${instanceTitlePrefix}_9`,
    type: 'SUDOC',
    value: `${classificationPrefix}L37.s:Oc1/2/991`,
    isMarc: false,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_10`,
    type: 'UDC',
    value: `${classificationPrefix}631.321:631.411.3`,
    isMarc: true,
    expectExact: false,
  },
  {
    title: `${instanceTitlePrefix}_11`,
    type: sharedCentralTypeName,
    value: `${classificationPrefix}VP000321`,
    isMarc: false,
    expectExact: true,
  },
];

const marcFiles = [
  {
    marc: 'marcBibFileC468276.mrc',
    fileNameImported: `testMarcFileC468276.${getRandomPostfix()}.mrc`,
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
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        cy.createTempUser(userPermissions).then((createdUser) => {
          user = createdUser;
          ClassificationIdentifierTypesConsortiumManager.createViaApi({
            payload: { name: sharedCentralTypeName },
          }).then((shared) => {
            sharedType = shared;
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
            ClassificationIdentifierTypes.getIdByName(sharedCentralTypeName).then(
              (sharedTypeId) => {
                ClassificationBrowse.updateIdentifierTypesAPI(
                  classificationBrowseId,
                  classificationBrowseAlgorithm,
                  [
                    CLASSIFICATION_IDENTIFIER_TYPES.LC,
                    CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
                    CLASSIFICATION_IDENTIFIER_TYPES.NLM,
                    sharedTypeId,
                  ],
                );
              },
            );
          });
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
        ClassificationIdentifierTypesConsortiumManager.deleteViaApi(sharedType);
        createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C468276 Classifications of each identifier type from Shared Instances could be found in the browse result list by "Library of Congress classification" option when LC, LC (local), NLM and local (shared) are selected in settings, from Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C468276'] },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
          }, 20_000);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
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
          // Check the third exact match and click on it
          const thirdExact = testClassifications.filter((tc) => tc.expectExact)[2];
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
          );
          InventorySearchAndFilter.browseSearch(thirdExact.value);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(thirdExact.value);
          InventorySearchAndFilter.selectFoundItemFromBrowse(thirdExact.value);
          InventorySearchAndFilter.verifySearchOptionAndQuery(
            'Query search',
            `classifications.classificationNumber=="${thirdExact.value}"`,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.switchToBrowseTab();
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(thirdExact.value);
        },
      );
    });
  });
});
