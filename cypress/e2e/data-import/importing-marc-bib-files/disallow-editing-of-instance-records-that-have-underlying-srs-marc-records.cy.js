import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let preconditionUserId;
    let user;
    let instanceHrid;
    let instanceId;
    const filePath = 'marcFileForC2361.mrc';
    const marcFileName = `C2361 autotestFileName${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        preconditionUserId = userProperties.userId;

        // create Instance with source = MARC
        DataImport.uploadFileViaApi(filePath, marcFileName, jobProfileToRun).then((response) => {
          instanceHrid = response[0].instance.hrid;
          instanceId = response[0].instance.id;
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(preconditionUserId);
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C2361 Disallow editing of Instance records that have underlying SRS MARC records',
      { tags: ['extendedPath', 'folijet', 'C2361'] },
      () => {
        InstanceRecordView.verifyInstancePaneExists();
        InstanceRecordView.edit();
        InstanceRecordEdit.checkReadOnlyFields();
        InstanceRecordEdit.checkCheckboxConditions([
          { label: 'Suppress from discovery', conditions: { disabled: false } },
          { label: 'Staff suppress', conditions: { disabled: false } },
          { label: 'Previously held', conditions: { disabled: false } },
        ]);
        InstanceRecordEdit.verifyCatalogDateInputIsDisabled(false);
        InstanceRecordEdit.verifyInstanceStatusTermConditionIsDisabled(false);
        InstanceRecordEdit.verifyStatisticalCodeIsEnabled();
        InstanceRecordEdit.verifyNatureOfContentIsEnabled();
        InstanceRecordEdit.verifyAddParentInstanceIsEnabled();
        InstanceRecordEdit.verifyAddChildInstanceIsEnabled();
      },
    );
  });
});
