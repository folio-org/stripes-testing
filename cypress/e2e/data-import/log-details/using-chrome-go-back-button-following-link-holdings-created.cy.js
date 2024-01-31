import {
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    let instanceHrid;
    const filePath = 'oneMarcBib.mrc';
    const fileName = `C353587 autotestFile${getRandomPostfix()}.mrc`;
    const mappingProfile = {
      name: `C353587 holdings mapping profile${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
      permanentLocationUI: LOCATION_NAMES.ONLINE_UI,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C353587 holdings action profile${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C353587 job profile${getRandomPostfix()}`,
    };

    before('create user and login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });

      // create mapping profile
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(mappingProfile.permanentLocation);
      NewFieldMappingProfile.save();

      // create action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfileByName('Default - Create instance');
      NewJobProfile.linkActionProfile(actionProfile);
      NewJobProfile.saveAndClose();

      // upload a marc file for creating of the new instance, holding and item
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePath, fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(jobProfile.profileName);
      JobProfiles.runImportFile();
      Logs.waitFileIsImported(fileName);
      Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete user', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C353587 After using the Chrome "go back" button, following the link "Holdings Created" from Data import to Inventory causes an error. (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        Logs.openFileDetails(fileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((hrId) => {
          instanceHrid = hrId;

          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstancePaneExists();
          cy.go('back');
          FileDetails.openHoldingsInInventory(RECORD_STATUSES.CREATED);
          HoldingsRecordView.checkHoldingRecordViewOpened();
        });
      },
    );
  });
});
