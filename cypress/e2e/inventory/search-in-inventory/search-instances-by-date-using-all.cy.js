import uuid from 'uuid';
import { Permissions } from '../../../support/dictionary';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DataImport from '../../../support/fragments/data_import/dataImport';
import randomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      instanceTitlePrefix: 'C553011 Sorting by Date check, Instance ',
      resourceTypeBody: {
        code: 'C553011type',
        id: uuid(),
        name: 'AT_C553011_type',
        source: 'local',
      },
      searchOption: 'All',
      resourceTypeAccordionName: 'Resource type',
      searchQueries: [
        '1678',
        '0007',
        '167u',
        '167b',
        'dd99',
        '16  ',
        ' 677',
        '*677',
        '1*77',
        '167*',
        '*77',
        '1670',
      ],
    };
    const expectedDates = [
      ['1678'],
      ['0007'],
      ['167u'],
      ['167b'],
      ['dd99'],
      ['167b', '16  '],
      [' 677'],
      [' 677', 'c677', 'u677'],
      ['1 77', '1d77', '1u77'],
      ['167 ', '167b', '1678', '167u'],
      [' 677', '1 77', 'c677', '1d77', 'u677', '1u77'],
      [],
    ];
    const notExpectedDates = ['167 ', '167b', '1678', '167u'];
    let resourceType;

    const marcFile = {
      marc: 'marcBibFileC553011.mrc',
      fileName: `testMarcFileC553011.${randomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const createdInstanceIds = [];

    before('Create test data, login', () => {
      cy.then(() => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C553011');
        cy.getInstanceTypes({ limit: 200 }).then((types) => {
          const duplicateTypes = types.filter(
            (type) => type.code === testData.resourceTypeBody.code,
          );
          if (!duplicateTypes.length) {
            cy.createInstanceType(testData.resourceTypeBody).then((type) => {
              resourceType = type;
            });
          } else resourceType = duplicateTypes[0];
        });
      })
        .then(() => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdInstanceIds.push(record[marcFile.propertyName].id);
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.userId = userProperties.userId;
            cy.waitForAuthRefresh(() => {
              cy.login(userProperties.username, userProperties.password);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.waitContentLoading();
            });
            InventorySearchAndFilter.toggleAccordionByName(testData.resourceTypeAccordionName);
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.resourceTypeAccordionName,
              testData.resourceTypeBody.name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.resourceTypeAccordionName,
              testData.resourceTypeBody.name,
            );
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      cy.deleteInstanceType(resourceType.id, true);
    });

    it(
      'C553011 Search for Instances by "Date" field using "All" search option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C553011'] },
      () => {
        testData.searchQueries.forEach((query, index) => {
          cy.intercept('GET', '/search/instances/facets?*').as('getFacets');
          cy.intercept('GET', '/search/instances?*').as('getInstances');
          InventorySearchAndFilter.selectSearchOption(testData.searchOption);
          InventorySearchAndFilter.executeSearch(query);
          cy.wait('@getFacets').its('response.statusCode').should('eq', 200);
          cy.wait('@getInstances').its('response.statusCode').should('eq', 200);
          expectedDates[index].forEach((date) => {
            InventorySearchAndFilter.verifyResultWithDate1Found(date);
          });
        });
        // wait to be sure that the results are updated
        cy.wait(1000);
        notExpectedDates.forEach((date) => {
          InventorySearchAndFilter.verifyResultWithDate1Found(date, false);
        });
      },
    );
  });
});
