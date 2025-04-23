/* eslint-disable no-unused-vars */
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
      searchQueries: [
        '1968',
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
    const expectedRecords = [
      [7],
      [29],
      [4],
      [16],
      [24],
      [9, 16],
      [11],
      [5, 11, 17],
      [6, 12, 18],
      [4, 10, 16, 21],
      [5, 6, 11, 12, 17, 18],
      [],
    ];
    let resourceTypeId;

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
        cy.getInstanceTypes().then((types) => {
          if (!types.filter((type) => type.code === testData.resourceTypeBody.code).length) {
            cy.createInstanceType(testData.resourceTypeBody).then((type) => {
              resourceTypeId = type.id;
            });
          }
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
            cy.login(userProperties.username, userProperties.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      cy.deleteInstanceType(resourceTypeId);
    });

    it(
      'C553011 Search for Instances by "Date" field using "All" search option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C553011'] },
      () => {},
    );
  });
});
