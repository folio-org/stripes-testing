import {
  DEFAULT_JOB_PROFILE_NAMES,
  // EXISTING_RECORD_NAMES,
  // FOLIO_RECORD_TYPE,
  // JOB_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
// import ExportFile from '../../../../support/fragments/data-export/exportFile';
// import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
// import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
// import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
// import Logs from '../../../../support/fragments/data_import/logs/logs';
// import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
// import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
// import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
// import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
// import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import {
//   ActionProfiles as SettingsActionProfiles,
//   FieldMappingProfiles as SettingsFieldMappingProfiles,
//   JobProfiles as SettingsJobProfiles,
//   MatchProfiles as SettingsMatchProfiles,
// } from '../../../../support/fragments/settings/dataImport';
// import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
// import Users from '../../../../support/fragments/users/users';
// import { getLongDelay } from '../../../../support/utils/cypressTools';
// import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import MarcFieldProtection from '../../../../support/fragments/settings/dataImport/marcFieldProtection';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      marcFile: {
        marc: 'oneMarcBib.mrc.mrc',
        fileName: `C449362 testMarcFile${getRandomPostfix()}.mrc`,
      },
      protectedField: '245',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      MarcFieldProtection.createViaApi({
        indicator1: '*',
        indicator2: '*',
        subfield: 'a',
        data: '*',
        source: 'USER',
        field: testData.protectedField,
      }).then((resp) => {
        testData.fieldId = resp.id;
      });
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.setTenant(Affiliations.College);
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;

        InventoryInstance.shareInstanceViaApi(
          testData.instanceId,
          testData.consortiaId,
          Affiliations.College,
          Affiliations.Consortia,
        );
      });

      cy.createTempUser([Permissions.inventoryAll.gui])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.inventoryAll.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.settingsDataImportEnabled.gui,
          ]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
    });

    it(
      'C449362 (CONSORTIA) Title of shared instance is not updated with protected field on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        // change file
        DataImport.editMarcFile(
          testData.marcFile.exportedFileName,
          testData.marcFile.modifiedMarcFile,
          [testData.instanceTitle, 'Proceedings'],
          [testData.updatedInstanceTitle, 'Proceedings Updated'],
        );
      },
    );
  });
});
