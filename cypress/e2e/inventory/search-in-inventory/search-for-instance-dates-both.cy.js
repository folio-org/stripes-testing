import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_DATE_TYPES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FilterItems from '../../../support/fragments/inventory/filterItems';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';

const testData = {
  dateColumnName: 'Date',
  searchQuery: 'C552486 Auto',
  instances: [
    {
      title: 'C552486 Auto (both dates) Instance 01: No dates given; BC date involved',
      dateType: INSTANCE_DATE_TYPES.BC,
      dates: '1901, 2001',
    },
    {
      title: 'C552486 Auto (both dates) Instance 02: Continuing resource currently published',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_PUBLISHED,
      dates: '1902-2002',
    },
    {
      title: 'C552486 Auto (both dates) Instance 03: Continuing resource ceased publication',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_CEASED,
      dates: '1903-2003',
    },
    {
      title: 'C552486 Auto (both dates) Instance 04: Detailed date',
      dateType: INSTANCE_DATE_TYPES.DETAILED,
      dates: '1904, 2004',
    },
    {
      title: 'C552486 Auto (both dates) Instance 05: Inclusive dates of collection',
      dateType: INSTANCE_DATE_TYPES.INCLUSIVE,
      dates: '1905-2005',
    },
    {
      title: 'C552486 Auto (both dates) Instance 06: Range of years of bulk of collection',
      dateType: INSTANCE_DATE_TYPES.RANGE,
      dates: '1906-2006',
    },
    {
      title: 'C552486 Auto (both dates) Instance 07: Multiple dates',
      dateType: INSTANCE_DATE_TYPES.MULTIPLE,
      dates: '1907, 2007',
    },
    {
      title: 'C552486 Auto (both dates) Instance 08: Dates unknown',
      dateType: INSTANCE_DATE_TYPES.UNKNOWN,
      dates: '1908, 2008',
    },
    {
      title:
        'C552486 Auto (both dates) Instance 09: Date of distribution/release/issue and production/recording session when different',
      dateType: INSTANCE_DATE_TYPES.DISTRIBUTION,
      dates: '1909, 2009',
    },
    {
      title: 'C552486 Auto (both dates) Instance 10: Questionable date',
      dateType: INSTANCE_DATE_TYPES.QUESTIONABLE,
      dates: '1910, 2010',
    },
    {
      title: 'C552486 Auto (both dates) Instance 11: Reprint/reissue date and original date',
      dateType: INSTANCE_DATE_TYPES.REPRINT,
      dates: '1911, 2011',
    },
    {
      title: 'C552486 Auto (both dates) Instance 12: Single known date/probable date',
      dateType: INSTANCE_DATE_TYPES.SINGLE,
      dates: '1912, 2012',
    },
    {
      title: 'C552486 Auto (both dates) Instance 13: Publication date and copyright date',
      dateType: INSTANCE_DATE_TYPES.PUBLICATION,
      dates: '1913, 2013',
    },
    {
      title: 'C552486 Auto (both dates) Instance 14: Continuing resource status unknown',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_UNKNOWN,
      dates: '1914-2014',
    },
    {
      title: 'C552486 Auto (both dates) Instance 15: No attempt to code',
      dateType: INSTANCE_DATE_TYPES.NO,
      dates: '1915, 2015',
    },
    {
      title: 'C552486 Auto (both dates) Instance 16: Not specified',
      dateType: INSTANCE_DATE_TYPES.NO,
      dates: '1916, 2016',
    },
  ],
};

const marcFile = {
  marc: 'marcBibFileC552486.mrc',
  fileName: `testMarcFileC552486.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
  propertyName: 'instance',
};

const createdInstanceIds = [];
let testUser;
let userForImport;

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: `title="${testData.searchQuery}*"`,
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportUploadAll.gui,
      ]).then((userProperties) => {
        userForImport = userProperties;
        cy.getToken(userForImport.username, userForImport.password, false);
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdInstanceIds.push(record[marcFile.propertyName].id);
          });
        });
      });
    });

    before('Create user, login', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testUser = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      Users.deleteViaApi(userForImport.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C552486 Check "Date" column in the result list, and instance detail view for each date type when both dates are specified in MARC bib record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C552486'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchQuery);
        testData.instances.forEach((instance) => {
          InventoryInstances.verifyValueInColumnForTitle(
            instance.title,
            testData.dateColumnName,
            instance.dates,
          );
          FilterItems.selectInstance(instance.title);
          InventoryInstance.waitInventoryLoading();
          InstanceRecordView.verifyDates(
            instance.dates.split(/,|-/).map((date) => date.trim())[0],
            instance.dates.split(/,|-/).map((date) => date.trim())[1],
            instance.dateType,
          );
          InventorySearchAndFilter.closeInstanceDetailPane();
        });
      },
    );
  });
});
