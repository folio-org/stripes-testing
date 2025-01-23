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
  searchQuery: 'C552488 Auto',
  instances: [
    {
      title: 'C552488 Auto (first date only) Instance 01: No dates given; BC date involved',
      dateType: INSTANCE_DATE_TYPES.BC,
      date1: '1921',
    },
    {
      title: 'C552488 Auto (first date only) Instance 02: Continuing resource currently published',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_PUBLISHED,
      date1: '1922-',
    },
    {
      title: 'C552488 Auto (first date only) Instance 03: Continuing resource ceased publication',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_CEASED,
      date1: '1923-',
    },
    {
      title: 'C552488 Auto (first date only) Instance 04: Detailed date',
      dateType: INSTANCE_DATE_TYPES.DETAILED,
      date1: '1924',
    },
    {
      title: 'C552488 Auto (first date only) Instance 05: Inclusive dates of collection',
      dateType: INSTANCE_DATE_TYPES.INCLUSIVE,
      date1: '1925-',
    },
    {
      title: 'C552488 Auto (first date only) Instance 06: Range of years of bulk of collection',
      dateType: INSTANCE_DATE_TYPES.RANGE,
      date1: '1926-',
    },
    {
      title: 'C552488 Auto (first date only) Instance 07: Multiple dates',
      dateType: INSTANCE_DATE_TYPES.MULTIPLE,
      date1: '1927',
    },
    {
      title: 'C552488 Auto (first date only) Instance 08: Dates unknown',
      dateType: INSTANCE_DATE_TYPES.UNKNOWN,
      date1: '1928',
    },
    {
      title:
        'C552488 Auto (first date only) Instance 09: Date of distribution/release/issue and production/recording session when different',
      dateType: INSTANCE_DATE_TYPES.DISTRIBUTION,
      date1: '1929',
    },
    {
      title: 'C552488 Auto (first date only) Instance 10: Questionable date',
      dateType: INSTANCE_DATE_TYPES.QUESTIONABLE,
      date1: '1930',
    },
    {
      title: 'C552488 Auto (first date only) Instance 11: Reprint/reissue date and original date',
      dateType: INSTANCE_DATE_TYPES.REPRINT,
      date1: '1931',
    },
    {
      title: 'C552488 Auto (first date only) Instance 12: Single known date/probable date',
      dateType: INSTANCE_DATE_TYPES.SINGLE,
      date1: '1932',
    },
    {
      title: 'C552488 Auto (first date only) Instance 13: Publication date and copyright date',
      dateType: INSTANCE_DATE_TYPES.PUBLICATION,
      date1: '1933',
    },
    {
      title: 'C552488 Auto (first date only) Instance 14: Continuing resource status unknown',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_UNKNOWN,
      date1: '1934-',
    },
    {
      title: 'C552488 Auto (first date only) Instance 15: No attempt to code',
      dateType: INSTANCE_DATE_TYPES.NO,
      date1: '1935',
    },
    {
      title: 'C552488 Auto (first date only) Instance 16: Not specified',
      dateType: INSTANCE_DATE_TYPES.NO,
      date1: '1936',
    },
  ],
};

const marcFile = {
  marc: 'marcBibFileC552488.mrc',
  fileName: `testMarcFileC552488.${getRandomPostfix()}.mrc`,
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
      'C552488 Check "Date" column in the result list, and instance detail view for each date type when only Date 1 is specified in MARC bib record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C552488'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchQuery);
        testData.instances.forEach((instance) => {
          InventoryInstances.verifyValueInColumnForTitle(
            instance.title,
            testData.dateColumnName,
            instance.date1,
          );
          FilterItems.selectInstance(instance.title);
          InventoryInstance.waitInventoryLoading();
          InstanceRecordView.verifyDates(
            instance.date1.replace('-', ''),
            undefined,
            instance.dateType,
          );
          InventorySearchAndFilter.closeInstanceDetailPane();
        });
      },
    );
  });
});
