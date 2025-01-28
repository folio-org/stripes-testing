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
  searchQuery: 'C552489 Auto',
  instances: [
    {
      title: 'C552489 Auto (second date only) Instance 01: No dates given; BC date involved',
      dateType: INSTANCE_DATE_TYPES.BC,
      date2: '1981',
    },
    {
      title: 'C552489 Auto (second date only) Instance 02: Continuing resource currently published',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_PUBLISHED,
      date2: '-1982',
    },
    {
      title: 'C552489 Auto (second date only) Instance 03: Continuing resource ceased publication',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_CEASED,
      date2: '-1983',
    },
    {
      title: 'C552489 Auto (second date only) Instance 04: Detailed date',
      dateType: INSTANCE_DATE_TYPES.DETAILED,
      date2: '1984',
    },
    {
      title: 'C552489 Auto (second date only) Instance 05: Inclusive dates of collection',
      dateType: INSTANCE_DATE_TYPES.INCLUSIVE,
      date2: '-1985',
    },
    {
      title: 'C552489 Auto (second date only) Instance 06: Range of years of bulk of collection',
      dateType: INSTANCE_DATE_TYPES.RANGE,
      date2: '-1986',
    },
    {
      title: 'C552489 Auto (second date only) Instance 07: Multiple dates',
      dateType: INSTANCE_DATE_TYPES.MULTIPLE,
      date2: '1987',
    },
    {
      title: 'C552489 Auto (second date only) Instance 08: Dates unknown',
      dateType: INSTANCE_DATE_TYPES.UNKNOWN,
      date2: '1988',
    },
    {
      title:
        'C552489 Auto (second date only) Instance 09: Date of distribution/release/issue and production/recording session when different',
      dateType: INSTANCE_DATE_TYPES.DISTRIBUTION,
      date2: '1989',
    },
    {
      title: 'C552489 Auto (second date only) Instance 10: Questionable date',
      dateType: INSTANCE_DATE_TYPES.QUESTIONABLE,
      date2: '1990',
    },
    {
      title: 'C552489 Auto (second date only) Instance 11: Reprint/reissue date and original date',
      dateType: INSTANCE_DATE_TYPES.REPRINT,
      date2: '1991',
    },
    {
      title: 'C552489 Auto (second date only) Instance 12: Single known date/probable date',
      dateType: INSTANCE_DATE_TYPES.SINGLE,
      date2: '1992',
    },
    {
      title: 'C552489 Auto (second date only) Instance 13: Publication date and copyright date',
      dateType: INSTANCE_DATE_TYPES.PUBLICATION,
      date2: '1993',
    },
    {
      title: 'C552489 Auto (second date only) Instance 14: Continuing resource status unknown',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_UNKNOWN,
      date2: '-1994',
    },
    {
      title: 'C552489 Auto (second date only) Instance 15: No attempt to code',
      dateType: INSTANCE_DATE_TYPES.NO,
      date2: '1995',
    },
    {
      title: 'C552489 Auto (second date only) Instance 16: Not specified',
      dateType: INSTANCE_DATE_TYPES.NO,
      date2: '1996',
    },
  ],
};

const marcFile = {
  marc: 'marcBibFileC552489.mrc',
  fileName: `testMarcFileC552489.${getRandomPostfix()}.mrc`,
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
      'C552489 Check "Date" column in the result list, and instance detail view for each date type when only Date 2 is specified in MARC bib record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C552489'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchQuery);
        testData.instances.forEach((instance) => {
          InventoryInstances.verifyValueInColumnForTitle(
            instance.title,
            testData.dateColumnName,
            instance.date2,
          );
          FilterItems.selectInstance(instance.title);
          InventoryInstance.waitInventoryLoading();
          InstanceRecordView.verifyDates(
            undefined,
            instance.date2.replace('-', ''),
            instance.dateType,
          );
          InventorySearchAndFilter.closeInstanceDetailPane();
        });
      },
    );
  });
});
