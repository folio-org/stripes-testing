import { DEFAULT_JOB_PROFILE_NAMES, INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe(
    'Instance',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let preconditionUserId;
      let user;
      let instanceHrid;
      let instanceId;
      const instanceSource = INSTANCE_SOURCE_NAMES.MARC;
      const filePathForUpload = 'oneMarcBib.mrc';
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
      const fileName = `C402775 autotestFile${getRandomPostfix()}.mrc`;

      beforeEach('Create test data and login', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          preconditionUserId = userProperties.userId;

          DataImport.uploadFileViaApi(filePathForUpload, fileName, jobProfileToRun).then(
            (response) => {
              instanceHrid = response[0].instance.hrid;
              instanceId = response[0].instance.id;
            },
          );
        });

        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          },
        );
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(preconditionUserId);
          Users.deleteViaApi(user.userId);
          InventoryInstance.deleteInstanceViaApi(instanceId);
        });
      });

      it(
        'C402775 (NON-CONSORTIA) Verify the Source of a MARC Instance on non-consortial tenant (folijet) (TaaS)',
        { tags: ['criticalPath', 'folijet', 'C402775', 'shiftLeft'] },
        () => {
          InventorySearchAndFilter.verifyPanesExist();
          InventorySearchAndFilter.instanceTabIsDefault();
          InventoryInstances.searchBySource(instanceSource);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyInstanceSource(instanceSource);
        },
      );
    },
  );
});
