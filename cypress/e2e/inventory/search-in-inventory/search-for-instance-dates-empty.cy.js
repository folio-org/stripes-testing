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
  searchQuery: 'C552491 Auto',
  instances: [
    {
      title: 'C552491 Auto (no dates) Instance 01: No dates given; BC date involved',
      dateType: INSTANCE_DATE_TYPES.BC,
    },
    {
      title: 'C552491 Auto (no dates) Instance 02: Continuing resource currently published',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_PUBLISHED,
    },
    {
      title: 'C552491 Auto (no dates) Instance 03: Continuing resource ceased publication',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_CEASED,
    },
    {
      title: 'C552491 Auto (no dates) Instance 04: Detailed date',
      dateType: INSTANCE_DATE_TYPES.DETAILED,
    },
    {
      title: 'C552491 Auto (no dates) Instance 05: Inclusive dates of collection',
      dateType: INSTANCE_DATE_TYPES.INCLUSIVE,
    },
    {
      title: 'C552491 Auto (no dates) Instance 06: Range of years of bulk of collection',
      dateType: INSTANCE_DATE_TYPES.RANGE,
    },
    {
      title: 'C552491 Auto (no dates) Instance 07: Multiple dates',
      dateType: INSTANCE_DATE_TYPES.MULTIPLE,
    },
    {
      title: 'C552491 Auto (no dates) Instance 08: Dates unknown',
      dateType: INSTANCE_DATE_TYPES.UNKNOWN,
    },
    {
      title:
        'C552491 Auto (no dates) Instance 09: Date of distribution/release/issue and production/recording session when different',
      dateType: INSTANCE_DATE_TYPES.DISTRIBUTION,
    },
    {
      title: 'C552491 Auto (no dates) Instance 10: Questionable date',
      dateType: INSTANCE_DATE_TYPES.QUESTIONABLE,
    },
    {
      title: 'C552491 Auto (no dates) Instance 11: Reprint/reissue date and original date',
      dateType: INSTANCE_DATE_TYPES.REPRINT,
    },
    {
      title: 'C552491 Auto (no dates) Instance 12: Single known date/probable date',
      dateType: INSTANCE_DATE_TYPES.SINGLE,
    },
    {
      title: 'C552491 Auto (no dates) Instance 13: Publication date and copyright date',
      dateType: INSTANCE_DATE_TYPES.PUBLICATION,
    },
    {
      title: 'C552491 Auto (no dates) Instance 14: Continuing resource status unknown',
      dateType: INSTANCE_DATE_TYPES.CONTINUING_UNKNOWN,
    },
    {
      title: 'C552491 Auto (no dates) Instance 15: No attempt to code',
      dateType: INSTANCE_DATE_TYPES.NO,
    },
    {
      title: 'C552491 Auto (no dates) Instance 16: Not specified',
      dateType: INSTANCE_DATE_TYPES.NO,
    },
  ],
};

const marcFile = {
  marc: 'marcBibFileC552491.mrc',
  fileName: `testMarcFileC552491.${getRandomPostfix()}.mrc`,
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
      'C552491 Check "Date" column in the result list, and instance detail view for each date type when dates are not specified in MARC bib record (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C552491'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchQuery);
        testData.instances.forEach((instance) => {
          InventoryInstances.verifyValueInColumnForTitle(
            instance.title,
            testData.dateColumnName,
            '',
          );
          FilterItems.selectInstance(instance.title);
          InventoryInstance.waitInventoryLoading();
          InstanceRecordView.verifyDates(undefined, undefined, instance.dateType);
          InventorySearchAndFilter.closeInstanceDetailPane();
        });
      },
    );
  });
});
