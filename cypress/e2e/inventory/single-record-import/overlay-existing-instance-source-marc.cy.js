import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Single record import', () => {
    const testData = {
      user: {},
      oclc: '1007797324',
      OCLCAuthentication: '100481406/PAOLF',
    };
    const marcFile = {
      filePath: 'oneMarcBib.mrc',
      fileName: `C193953 autotestFile${getRandomPostfix()}.mrc`,
      jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    };

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        const preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi(marcFile.filePath, marcFile.fileName, marcFile.jobProfile).then(
          (response) => {
            testData.instanceId = response[0].instance.id;
          },
        );
        cy.getAdminToken();
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
        Users.deleteViaApi(preconditionUserId);
      });

      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C193953 Overlay existing Source = MARC Instance by import of single MARC Bib record from OCLC (folijet)',
      { tags: ['smoke', 'folijet', 'C193953'] },
      () => {
        InventorySearchAndFilter.byKeywords(testData.instanceId);
        InstanceRecordView.waitLoading();
        InventoryActions.import(testData.oclc);
        InstanceRecordView.waitLoading();
        InventoryInstance.viewSource();
        InventoryViewSource.contains('999\tf f\t$i');
        InventoryViewSource.contains('$s');
      },
    );
  });
});
